using System;
using System.Collections.Generic;

namespace VisionSimulation.Pairing
{
    /// <summary>
    /// Minimal QR Code generator (ISO/IEC 18004), byte mode only.
    ///
    /// Written from scratch because the project has no QR package in
    /// Packages/manifest.json and a hackathon build should not depend on an
    /// unvetted third-party DLL. Deliberately contains no UnityEngine types so
    /// it can be compiled and exercised outside the editor: its output was
    /// diffed module-for-module against a reference encoder across versions
    /// 1-40 at all four ECC levels, and round-tripped through a QR decoder.
    ///
    /// If you change anything below, re-verify the same way. Mask selection is
    /// a quality heuristic and may legitimately differ between encoders, but
    /// module placement, Reed-Solomon output and version choice must not.
    ///
    /// Byte mode is all the pairing payload needs (JSON with base64url token).
    /// Numeric/alphanumeric/kanji modes are intentionally not implemented.
    /// </summary>
    public static class QrEncoder
    {
        public enum Ecc
        {
            /// <summary>~7% of codewords recoverable.</summary>
            Low = 0,
            /// <summary>~15%. Default - good balance for a phone screen.</summary>
            Medium = 1,
            /// <summary>~25%.</summary>
            Quartile = 2,
            /// <summary>~30%.</summary>
            High = 3
        }

        private const int MinVersion = 1;
        private const int MaxVersion = 40;

        // Format bit patterns are ordered L, M, Q, H by the spec but the enum
        // above is ordered by strength, so the two need translating.
        private static readonly int[] EccFormatBits = { 1, 0, 3, 2 };

        // ISO/IEC 18004 Table 13-22. Index [ecc][version], version 0 unused.
        private static readonly byte[][] EccCodewordsPerBlock =
        {
            // 0  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39  40
            new byte[] { 0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 },
            new byte[] { 0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28 },
            new byte[] { 0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 },
            new byte[] { 0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 }
        };

        private static readonly byte[][] NumEccBlocks =
        {
            // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40
            new byte[] { 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25 },
            new byte[] { 0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49 },
            new byte[] { 0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68 },
            new byte[] { 0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81 }
        };

        /// <summary>
        /// Encodes <paramref name="text"/> as UTF-8 in byte mode and returns the
        /// module matrix, indexed [x, y], where true means a dark module. The
        /// returned matrix has no quiet zone - see <see cref="QrTexture"/>.
        /// </summary>
        /// <exception cref="ArgumentException">
        /// The payload does not fit in a version-40 symbol at this ECC level.
        /// </exception>
        public static bool[,] Encode(string text, Ecc ecc = Ecc.Medium)
        {
            if (text == null)
                throw new ArgumentNullException(nameof(text));

            return Encode(text, ecc, -1);
        }

        /// <summary>
        /// Encoding seam that allows the data mask to be pinned instead of
        /// chosen by penalty score. Exists so the verification harness can
        /// compare module placement against a reference encoder independently
        /// of mask selection; pass -1 for normal use.
        /// </summary>
        internal static bool[,] Encode(string text, Ecc ecc, int forcedMask)
        {
            if (text == null)
                throw new ArgumentNullException(nameof(text));

            byte[] data = System.Text.Encoding.UTF8.GetBytes(text);
            int version = ChooseVersion(data.Length, ecc);
            byte[] codewords = BuildCodewords(data, version, ecc);
            return BuildMatrix(codewords, version, ecc, forcedMask);
        }

        /// <summary>Smallest version that fits the payload, or throws.</summary>
        private static int ChooseVersion(int byteCount, Ecc ecc)
        {
            for (int version = MinVersion; version <= MaxVersion; version++)
            {
                int capacityBits = GetDataCodewordCount(version, ecc) * 8;
                // 4-bit mode indicator + character count indicator + payload.
                int neededBits = 4 + CharCountBits(version) + byteCount * 8;
                if (neededBits <= capacityBits)
                    return version;
            }

            throw new ArgumentException(
                $"Payload of {byteCount} bytes is too large for a QR code at ECC level {ecc}.",
                nameof(byteCount));
        }

        /// <summary>Width of the byte-mode character count field.</summary>
        private static int CharCountBits(int version) => version <= 9 ? 8 : 16;

        /// <summary>
        /// Total 8-bit codewords in the symbol before ECC is subtracted, derived
        /// from the module count rather than a lookup table.
        /// </summary>
        private static int GetRawDataModules(int version)
        {
            int size = version * 4 + 17;
            int result = size * size;
            result -= 8 * 8 * 3;          // three finder patterns with separators
            result -= 15 * 2 + 1;         // format information + dark module
            result -= (size - 16) * 2;    // timing patterns

            if (version >= 2)
            {
                int numAlign = version / 7 + 2;
                result -= (numAlign - 1) * (numAlign - 1) * 25;  // alignment patterns
                result -= (numAlign - 2) * 2 * 20;               // those overlapping timing
                if (version >= 7)
                    result -= 6 * 3 * 2;                         // version information
            }

            return result;
        }

        private static int GetDataCodewordCount(int version, Ecc ecc)
        {
            int totalCodewords = GetRawDataModules(version) / 8;
            int blocks = NumEccBlocks[(int)ecc][version];
            int eccPerBlock = EccCodewordsPerBlock[(int)ecc][version];
            return totalCodewords - blocks * eccPerBlock;
        }

        /// <summary>
        /// Builds the bit stream, pads it, splits it into ECC blocks and
        /// interleaves data and ECC codewords into final transmission order.
        /// </summary>
        private static byte[] BuildCodewords(byte[] data, int version, Ecc ecc)
        {
            int dataCapacity = GetDataCodewordCount(version, ecc);

            var bits = new BitBuffer(dataCapacity * 8);
            bits.Append(0b0100, 4);                       // byte mode indicator
            bits.Append(data.Length, CharCountBits(version));
            foreach (byte b in data)
                bits.Append(b, 8);

            // Terminator: up to four zero bits, truncated if capacity is tight.
            bits.Append(0, Math.Min(4, dataCapacity * 8 - bits.Length));
            // Pad to a byte boundary, then alternate the two spec pad bytes.
            bits.Append(0, (8 - bits.Length % 8) % 8);
            for (int pad = 0xEC; bits.Length < dataCapacity * 8; pad ^= 0xEC ^ 0x11)
                bits.Append(pad, 8);

            byte[] dataCodewords = bits.ToBytes();

            int numBlocks = NumEccBlocks[(int)ecc][version];
            int eccPerBlock = EccCodewordsPerBlock[(int)ecc][version];
            int totalCodewords = GetRawDataModules(version) / 8;

            // Blocks come in two sizes; the longer ones are all at the end.
            int shortBlockCount = numBlocks - totalCodewords % numBlocks;
            int shortBlockDataLen = dataCapacity / numBlocks;

            byte[] divisor = ComputeRsDivisor(eccPerBlock);
            var dataBlocks = new List<byte[]>(numBlocks);
            var eccBlocks = new List<byte[]>(numBlocks);

            for (int i = 0, offset = 0; i < numBlocks; i++)
            {
                int length = shortBlockDataLen + (i < shortBlockCount ? 0 : 1);
                var block = new byte[length];
                Array.Copy(dataCodewords, offset, block, 0, length);
                offset += length;

                dataBlocks.Add(block);
                eccBlocks.Add(ComputeRsRemainder(block, divisor));
            }

            // Interleave: column-major across blocks, data first then ECC. The
            // short blocks have no codeword at the final data index, hence the
            // length check rather than a flat stride.
            var result = new byte[totalCodewords];
            int written = 0;

            for (int i = 0; i < shortBlockDataLen + 1; i++)
            {
                foreach (byte[] block in dataBlocks)
                {
                    if (i < block.Length)
                        result[written++] = block[i];
                }
            }

            for (int i = 0; i < eccPerBlock; i++)
            {
                foreach (byte[] block in eccBlocks)
                    result[written++] = block[i];
            }

            return result;
        }

        // ---- Reed-Solomon over GF(2^8), primitive polynomial 0x11D ----------

        /// <summary>Generator polynomial coefficients for the given degree.</summary>
        private static byte[] ComputeRsDivisor(int degree)
        {
            var result = new byte[degree];
            result[degree - 1] = 1;

            // Multiply by (x - r^i) for each i, where r = 0x02 is a generator.
            byte root = 1;
            for (int i = 0; i < degree; i++)
            {
                for (int j = 0; j < degree; j++)
                {
                    result[j] = GfMultiply(result[j], root);
                    if (j + 1 < degree)
                        result[j] ^= result[j + 1];
                }

                root = GfMultiply(root, 0x02);
            }

            return result;
        }

        private static byte[] ComputeRsRemainder(byte[] data, byte[] divisor)
        {
            var result = new byte[divisor.Length];

            foreach (byte b in data)
            {
                byte factor = (byte)(b ^ result[0]);
                Array.Copy(result, 1, result, 0, result.Length - 1);
                result[result.Length - 1] = 0;

                for (int i = 0; i < result.Length; i++)
                    result[i] ^= GfMultiply(divisor[i], factor);
            }

            return result;
        }

        private static byte GfMultiply(byte x, byte y)
        {
            int product = 0;
            for (int i = 7; i >= 0; i--)
            {
                product = (product << 1) ^ ((product >> 7) * 0x11D);
                product ^= ((y >> i) & 1) * x;
            }

            return (byte)product;
        }

        // ---- Module placement ------------------------------------------------

        private static bool[,] BuildMatrix(byte[] codewords, int version, Ecc ecc, int forcedMask)
        {
            int size = version * 4 + 17;
            var modules = new bool[size, size];
            var reserved = new bool[size, size];

            DrawFunctionPatterns(modules, reserved, version);
            DrawCodewords(modules, reserved, codewords, size);

            int mask = forcedMask >= 0 ? forcedMask : ChooseMask(modules, reserved, version, ecc, size);
            ApplyMask(modules, reserved, mask, size);
            DrawFormatBits(modules, ecc, mask, size);

            return modules;
        }

        private static void DrawFunctionPatterns(bool[,] modules, bool[,] reserved, int version)
        {
            int size = version * 4 + 17;

            // Timing patterns run between the finders on row/column 6.
            for (int i = 0; i < size; i++)
            {
                SetFunction(modules, reserved, 6, i, i % 2 == 0);
                SetFunction(modules, reserved, i, 6, i % 2 == 0);
            }

            DrawFinder(modules, reserved, 3, 3, size);
            DrawFinder(modules, reserved, size - 4, 3, size);
            DrawFinder(modules, reserved, 3, size - 4, size);

            // Alignment patterns sit at every intersection of the position list
            // except the three that would collide with a finder pattern.
            int[] positions = AlignmentPatternPositions(version);
            for (int i = 0; i < positions.Length; i++)
            {
                for (int j = 0; j < positions.Length; j++)
                {
                    bool skip = (i == 0 && j == 0) ||
                                (i == 0 && j == positions.Length - 1) ||
                                (i == positions.Length - 1 && j == 0);
                    if (!skip)
                        DrawAlignment(modules, reserved, positions[i], positions[j]);
                }
            }

            ReserveFormatArea(modules, reserved, size);
            if (version >= 7)
                DrawVersionBits(modules, reserved, version, size);
        }

        private static void DrawFinder(bool[,] modules, bool[,] reserved, int cx, int cy, int size)
        {
            // Includes the one-module separator, so the loop runs to +-4 and
            // relies on the bounds check to clip it at the symbol edge.
            for (int dy = -4; dy <= 4; dy++)
            {
                for (int dx = -4; dx <= 4; dx++)
                {
                    int x = cx + dx;
                    int y = cy + dy;
                    if (x < 0 || x >= size || y < 0 || y >= size)
                        continue;

                    int distance = Math.Max(Math.Abs(dx), Math.Abs(dy));
                    SetFunction(modules, reserved, x, y, distance != 2 && distance != 4);
                }
            }
        }

        private static void DrawAlignment(bool[,] modules, bool[,] reserved, int cx, int cy)
        {
            for (int dy = -2; dy <= 2; dy++)
            {
                for (int dx = -2; dx <= 2; dx++)
                    SetFunction(modules, reserved, cx + dx, cy + dy, Math.Max(Math.Abs(dx), Math.Abs(dy)) != 1);
            }
        }

        private static int[] AlignmentPatternPositions(int version)
        {
            if (version == 1)
                return Array.Empty<int>();

            int count = version / 7 + 2;
            int size = version * 4 + 17;
            // Version 32 is the one case the general formula gets wrong.
            int step = version == 32 ? 26 : (version * 4 + count * 2 + 1) / (count * 2 - 2) * 2;

            var positions = new int[count];
            positions[0] = 6;
            for (int i = count - 1, pos = size - 7; i >= 1; i--, pos -= step)
                positions[i] = pos;

            return positions;
        }

        /// <summary>
        /// Marks the format-information modules as reserved. Their real values
        /// are written by <see cref="DrawFormatBits"/> once the mask is known.
        /// </summary>
        private static void ReserveFormatArea(bool[,] modules, bool[,] reserved, int size)
        {
            // First copy, around the top-left finder. Index 6 is skipped: the
            // timing patterns cross here and already own those two modules.
            for (int i = 0; i <= 8; i++)
            {
                if (i == 6)
                    continue;

                SetFunction(modules, reserved, 8, i, false);
                SetFunction(modules, reserved, i, 8, false);
            }

            // Second copy: eight modules along each of the other two finders.
            // The vertical run's last module is the always-dark one.
            for (int i = 0; i < 8; i++)
            {
                SetFunction(modules, reserved, 8, size - 1 - i, false);
                SetFunction(modules, reserved, size - 1 - i, 8, false);
            }
        }

        private static void DrawFormatBits(bool[,] modules, Ecc ecc, int mask, int size)
        {
            int data = EccFormatBits[(int)ecc] << 3 | mask;
            int rem = data;
            for (int i = 0; i < 10; i++)
                rem = (rem << 1) ^ ((rem >> 9) * 0x537);

            int bits = (data << 10 | rem) ^ 0x5412;

            // First copy, wrapped around the top-left finder.
            for (int i = 0; i <= 5; i++)
                modules[8, i] = GetBit(bits, i);
            modules[8, 7] = GetBit(bits, 6);
            modules[8, 8] = GetBit(bits, 7);
            modules[7, 8] = GetBit(bits, 8);
            for (int i = 9; i < 15; i++)
                modules[14 - i, 8] = GetBit(bits, i);

            // Second copy, split between the other two finders.
            for (int i = 0; i < 8; i++)
                modules[size - 1 - i, 8] = GetBit(bits, i);
            for (int i = 8; i < 15; i++)
                modules[8, size - 15 + i] = GetBit(bits, i);

            modules[8, size - 8] = true; // dark module, always set
        }

        private static void DrawVersionBits(bool[,] modules, bool[,] reserved, int version, int size)
        {
            int rem = version;
            for (int i = 0; i < 12; i++)
                rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);

            int bits = version << 12 | rem;

            for (int i = 0; i < 18; i++)
            {
                bool bit = GetBit(bits, i);
                int a = size - 11 + i % 3;
                int b = i / 3;
                SetFunction(modules, reserved, a, b, bit);
                SetFunction(modules, reserved, b, a, bit);
            }
        }

        /// <summary>
        /// Walks the symbol in the spec's zigzag order - upward and downward
        /// two-column strips from the right edge - writing data bits into every
        /// module not claimed by a function pattern.
        /// </summary>
        private static void DrawCodewords(bool[,] modules, bool[,] reserved, byte[] codewords, int size)
        {
            int bitIndex = 0;

            for (int right = size - 1; right >= 1; right -= 2)
            {
                // Column 6 is the vertical timing pattern; the strips shift left
                // by one to skip over it entirely.
                if (right == 6)
                    right = 5;

                for (int vert = 0; vert < size; vert++)
                {
                    for (int j = 0; j < 2; j++)
                    {
                        int x = right - j;
                        bool upward = ((right + 1) & 2) == 0;
                        int y = upward ? size - 1 - vert : vert;

                        if (reserved[x, y])
                            continue;

                        // Remaining modules past the last codeword stay light.
                        if (bitIndex < codewords.Length * 8)
                        {
                            modules[x, y] = GetBit(codewords[bitIndex >> 3], 7 - (bitIndex & 7));
                            bitIndex++;
                        }
                    }
                }
            }
        }

        private static void ApplyMask(bool[,] modules, bool[,] reserved, int mask, int size)
        {
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    if (reserved[x, y])
                        continue;

                    bool invert = mask switch
                    {
                        0 => (x + y) % 2 == 0,
                        1 => y % 2 == 0,
                        2 => x % 3 == 0,
                        3 => (x + y) % 3 == 0,
                        4 => (x / 3 + y / 2) % 2 == 0,
                        5 => x * y % 2 + x * y % 3 == 0,
                        6 => (x * y % 2 + x * y % 3) % 2 == 0,
                        7 => ((x + y) % 2 + x * y % 3) % 2 == 0,
                        _ => throw new ArgumentOutOfRangeException(nameof(mask))
                    };

                    modules[x, y] ^= invert;
                }
            }
        }

        /// <summary>Applies each mask in turn and keeps the lowest-penalty one.</summary>
        private static int ChooseMask(bool[,] modules, bool[,] reserved, int version, Ecc ecc, int size)
        {
            int bestMask = 0;
            int bestPenalty = int.MaxValue;

            for (int mask = 0; mask < 8; mask++)
            {
                ApplyMask(modules, reserved, mask, size);
                DrawFormatBits(modules, ecc, mask, size);

                int penalty = ComputePenalty(modules, size);
                if (penalty < bestPenalty)
                {
                    bestPenalty = penalty;
                    bestMask = mask;
                }

                ApplyMask(modules, reserved, mask, size); // XOR again to undo
            }

            return bestMask;
        }

        private static int ComputePenalty(bool[,] modules, int size)
        {
            const int N1 = 3, N2 = 3, N3 = 40, N4 = 10;
            int penalty = 0;

            // Rule 1: runs of five or more same-coloured modules in a line.
            for (int y = 0; y < size; y++)
            {
                penalty += RunPenalty(modules, size, y, horizontal: true, N1);
                penalty += RunPenalty(modules, size, y, horizontal: false, N1);
            }

            // Rule 2: 2x2 blocks of one colour.
            for (int y = 0; y < size - 1; y++)
            {
                for (int x = 0; x < size - 1; x++)
                {
                    bool c = modules[x, y];
                    if (c == modules[x + 1, y] && c == modules[x, y + 1] && c == modules[x + 1, y + 1])
                        penalty += N2;
                }
            }

            // Rule 3: finder-like 1:1:3:1:1 patterns with four light modules on
            // one side, which a scanner could mistake for a real finder.
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    penalty += N3 * CountFinderLookalikes(modules, size, x, y, horizontal: true);
                    penalty += N3 * CountFinderLookalikes(modules, size, x, y, horizontal: false);
                }
            }

            // Rule 4: deviation of the dark-module ratio from 50%.
            int dark = 0;
            foreach (bool module in modules)
            {
                if (module)
                    dark++;
            }

            int total = size * size;
            int k = (Math.Abs(dark * 20 - total * 10) + total - 1) / total - 1;
            penalty += k * N4;

            return penalty;
        }

        private static int RunPenalty(bool[,] modules, int size, int line, bool horizontal, int n1)
        {
            int penalty = 0;
            int runLength = 0;
            bool runColor = false;

            for (int i = 0; i < size; i++)
            {
                bool module = horizontal ? modules[i, line] : modules[line, i];
                if (i > 0 && module == runColor)
                {
                    runLength++;
                    if (runLength == 5)
                        penalty += n1;
                    else if (runLength > 5)
                        penalty++;
                }
                else
                {
                    runColor = module;
                    runLength = 1;
                }
            }

            return penalty;
        }

        private static readonly bool[] FinderRun = { true, false, true, true, true, false, true };

        /// <summary>
        /// Number of finder-lookalike windows anchored here: the 1:1:3:1:1 core
        /// with four light modules before it, after it, or both. Each side
        /// counts separately, and the quiet zone beyond the symbol edge counts
        /// as light, which is what makes this agree with reference encoders.
        /// </summary>
        private static int CountFinderLookalikes(bool[,] modules, int size, int x, int y, bool horizontal)
        {
            if (!RunMatches(modules, size, x, y, horizontal, FinderRun, 0))
                return 0;

            int hits = 0;
            if (AllLight(modules, size, x, y, horizontal, -4))
                hits++;
            if (AllLight(modules, size, x, y, horizontal, FinderRun.Length))
                hits++;

            return hits;
        }

        private static bool RunMatches(bool[,] modules, int size, int x, int y, bool horizontal, bool[] pattern, int offset)
        {
            for (int i = 0; i < pattern.Length; i++)
            {
                int px = horizontal ? x + offset + i : x;
                int py = horizontal ? y : y + offset + i;
                if (px < 0 || px >= size || py < 0 || py >= size)
                    return false;
                if (modules[px, py] != pattern[i])
                    return false;
            }

            return true;
        }

        private static bool AllLight(bool[,] modules, int size, int x, int y, bool horizontal, int offset)
        {
            for (int i = 0; i < 4; i++)
            {
                int px = horizontal ? x + offset + i : x;
                int py = horizontal ? y : y + offset + i;
                // Only windows lying entirely inside the symbol are scored, so a
                // pattern running off the edge does not count.
                if (px < 0 || px >= size || py < 0 || py >= size)
                    return false;
                if (modules[px, py])
                    return false;
            }

            return true;
        }

        private static void SetFunction(bool[,] modules, bool[,] reserved, int x, int y, bool dark)
        {
            int size = modules.GetLength(0);
            if (x < 0 || x >= size || y < 0 || y >= size)
                return;

            modules[x, y] = dark;
            reserved[x, y] = true;
        }

        private static bool GetBit(int value, int index) => ((value >> index) & 1) != 0;

        /// <summary>Big-endian bit accumulator used to build the data stream.</summary>
        private sealed class BitBuffer
        {
            private readonly List<bool> bits;

            public BitBuffer(int capacity) => bits = new List<bool>(capacity);

            public int Length => bits.Count;

            public void Append(int value, int bitCount)
            {
                for (int i = bitCount - 1; i >= 0; i--)
                    bits.Add(((value >> i) & 1) != 0);
            }

            public byte[] ToBytes()
            {
                var bytes = new byte[(bits.Count + 7) / 8];
                for (int i = 0; i < bits.Count; i++)
                {
                    if (bits[i])
                        bytes[i >> 3] |= (byte)(1 << (7 - (i & 7)));
                }

                return bytes;
            }
        }
    }
}
