using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace VisionSimulation.Networking
{
    public enum RelayConnectionState
    {
        Disconnected,
        Connecting,
        Connected,
        Closed,
        Failed
    }

    /// <summary>
    /// Transport-level WebSocket client for the relay.
    ///
    /// Uses System.Net.WebSockets.ClientWebSocket rather than a third-party
    /// package because the project has no WebSocket dependency in
    /// Packages/manifest.json. That type works on Android (Mono and IL2CPP) and
    /// in the editor, but NOT on WebGL - which this project does not target.
    ///
    /// Everything here runs off the main thread. Nothing in this class touches
    /// UnityEngine, and received frames are handed over through a concurrent
    /// queue that <see cref="RelaySession"/> drains inside Update, so callers
    /// only ever see messages on the main thread.
    /// </summary>
    public sealed class RelayClient : IDisposable
    {
        private readonly ConcurrentQueue<string> inbound = new ConcurrentQueue<string>();
        private readonly ConcurrentQueue<string> transportErrors = new ConcurrentQueue<string>();

        /// <summary>ClientWebSocket forbids overlapping SendAsync calls.</summary>
        private readonly SemaphoreSlim sendLock = new SemaphoreSlim(1, 1);

        private ClientWebSocket socket;
        private CancellationTokenSource cancellation;
        private int state = (int)RelayConnectionState.Disconnected;
        private volatile bool disposed;

        /// <summary>Close code reported by the peer, once the socket has closed.</summary>
        public WebSocketCloseStatus? CloseStatus { get; private set; }

        public string CloseReason { get; private set; }

        public RelayConnectionState State => (RelayConnectionState)Volatile.Read(ref state);

        /// <summary>
        /// Opens the connection. Safe to call once per instance; a client that
        /// has closed or failed must be replaced rather than reconnected, which
        /// matches the relay's model where a dropped socket loses its room.
        /// </summary>
        public void Connect(string url)
        {
            if (disposed)
                throw new ObjectDisposedException(nameof(RelayClient));

            if (State != RelayConnectionState.Disconnected)
                throw new InvalidOperationException($"RelayClient is already {State}.");

            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri uri) ||
                (uri.Scheme != "ws" && uri.Scheme != "wss"))
            {
                Volatile.Write(ref state, (int)RelayConnectionState.Failed);
                transportErrors.Enqueue($"'{url}' is not a valid ws:// or wss:// URL.");
                return;
            }

            Volatile.Write(ref state, (int)RelayConnectionState.Connecting);
            cancellation = new CancellationTokenSource();
            socket = new ClientWebSocket();

            // Fire and forget: the loop reports back through the queues, and the
            // returned task is never awaited on the main thread.
            _ = RunAsync(uri, cancellation.Token);
        }

        private async Task RunAsync(Uri uri, CancellationToken token)
        {
            try
            {
                await socket.ConnectAsync(uri, token).ConfigureAwait(false);
                Volatile.Write(ref state, (int)RelayConnectionState.Connected);
                await ReceiveLoopAsync(token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Local shutdown; Close() already recorded the state.
            }
            catch (Exception e)
            {
                Volatile.Write(ref state, (int)RelayConnectionState.Failed);
                transportErrors.Enqueue(Describe(e));
            }
        }

        private async Task ReceiveLoopAsync(CancellationToken token)
        {
            // One frame may arrive split across several reads, so partial reads
            // accumulate here until EndOfMessage.
            var buffer = new byte[4096];
            var message = new StringBuilder();

            while (!token.IsCancellationRequested && socket.State == WebSocketState.Open)
            {
                WebSocketReceiveResult result;
                try
                {
                    result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token)
                        .ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
                catch (Exception e)
                {
                    Volatile.Write(ref state, (int)RelayConnectionState.Failed);
                    transportErrors.Enqueue(Describe(e));
                    return;
                }

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    CloseStatus = result.CloseStatus;
                    CloseReason = result.CloseStatusDescription;
                    Volatile.Write(ref state, (int)RelayConnectionState.Closed);

                    try
                    {
                        await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None)
                            .ConfigureAwait(false);
                    }
                    catch (Exception)
                    {
                        // The peer is already gone; nothing useful to report.
                    }

                    return;
                }

                message.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                if (!result.EndOfMessage)
                    continue;

                inbound.Enqueue(message.ToString());
                message.Clear();
            }
        }

        /// <summary>
        /// Queues a frame for delivery. Returns false when the socket is not
        /// open, so callers can distinguish "not sent" from "sent and rejected".
        /// </summary>
        public bool Send(string json)
        {
            if (disposed || socket == null || socket.State != WebSocketState.Open)
                return false;

            _ = SendAsync(json);
            return true;
        }

        private async Task SendAsync(string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            CancellationToken token = cancellation?.Token ?? CancellationToken.None;

            try
            {
                await sendLock.WaitAsync(token).ConfigureAwait(false);
            }
            catch (Exception)
            {
                return; // cancelled or disposed while queued
            }

            try
            {
                await socket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    endOfMessage: true,
                    token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Shutting down.
            }
            catch (Exception e)
            {
                Volatile.Write(ref state, (int)RelayConnectionState.Failed);
                transportErrors.Enqueue(Describe(e));
            }
            finally
            {
                sendLock.Release();
            }
        }

        /// <summary>Pops one received frame, if any is waiting.</summary>
        public bool TryDequeue(out string json) => inbound.TryDequeue(out json);

        /// <summary>Pops one transport-level failure description, if any.</summary>
        public bool TryDequeueError(out string error) => transportErrors.TryDequeue(out error);

        /// <summary>
        /// Closes the socket politely. The relay treats a dropped simulation
        /// socket as the end of the room, so this is also how a session ends.
        /// </summary>
        public void Close()
        {
            if (disposed)
                return;

            Volatile.Write(ref state, (int)RelayConnectionState.Closed);
            _ = CloseAsync();
        }

        private async Task CloseAsync()
        {
            try
            {
                if (socket != null && socket.State == WebSocketState.Open)
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "client closing", CancellationToken.None)
                        .ConfigureAwait(false);
                }
            }
            catch (Exception)
            {
                // Best effort - the socket is being torn down regardless.
            }
            finally
            {
                cancellation?.Cancel();
            }
        }

        public void Dispose()
        {
            if (disposed)
                return;

            disposed = true;

            try
            {
                cancellation?.Cancel();
            }
            catch (Exception)
            {
                // Already disposed.
            }

            cancellation?.Dispose();
            socket?.Dispose();
            sendLock.Dispose();
        }

        /// <summary>
        /// Unwraps the AggregateException/inner-exception nesting that
        /// ClientWebSocket wraps around the useful message.
        /// </summary>
        private static string Describe(Exception e)
        {
            Exception current = e;
            while (current.InnerException != null)
                current = current.InnerException;

            return current.Message;
        }
    }
}
