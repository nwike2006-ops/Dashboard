// Source: Blue Letter Bible "Daily Bible Reading Program – Chronological Plan" (1-year).
// https://www.blueletterbible.org/assets/pdf/dbrp/1Yr_ChronologicalPlan.pdf
// Transcribed verbatim, one day per line, index 0 = Day 1.
// Psalms are woven in chronologically wherever their likely historical moment falls
// (mostly during 1-2 Samuel / 1 Chronicles, David's reign); the remaining undated
// Psalms are grouped in ascending batches later in the plan.
const RAW_PLAN = `
Genesis 1-3
Genesis 4-7
Genesis 8-11
Job 1-5
Job 6-9
Job 10-13
Job 14-16
Job 17-20
Job 21-23
Job 24-28
Job 29-31
Job 32-34
Job 35-37
Job 38-39
Job 40-42
Genesis 12-15
Genesis 16-18
Genesis 19-21
Genesis 22-24
Genesis 25-26
Genesis 27-29
Genesis 30-31
Genesis 32-34
Genesis 35-37
Genesis 38-40
Genesis 41-42
Genesis 43-45
Genesis 46-47
Genesis 48-50
Exodus 1-3
Exodus 4-6
Exodus 7-9
Exodus 10-12
Exodus 13-15
Exodus 16-18
Exodus 19-21
Exodus 22-24
Exodus 25-27
Exodus 28-29
Exodus 30-32
Exodus 33-35
Exodus 36-38
Exodus 39-40
Leviticus 1-4
Leviticus 5-7
Leviticus 8-10
Leviticus 11-13
Leviticus 14-15
Leviticus 16-18
Leviticus 19-21
Leviticus 22-23
Leviticus 24-25
Leviticus 26-27
Numbers 1-2
Numbers 3-4
Numbers 5-6
Numbers 7
Numbers 8-10
Numbers 11-13
Numbers 14-15
Numbers 16-17
Numbers 18-20
Numbers 21-22
Numbers 23-25
Numbers 26-27
Numbers 28-30
Numbers 31-32
Numbers 33-34
Numbers 35-36
Deuteronomy 1-2
Deuteronomy 3-4
Deuteronomy 5-7
Deuteronomy 8-10
Deuteronomy 11-13
Deuteronomy 14-16
Deuteronomy 17-20
Deuteronomy 21-23
Deuteronomy 24-27
Deuteronomy 28-29
Deuteronomy 30-31
Deuteronomy 32-34; Psalm 90
Joshua 1-4
Joshua 5-8
Joshua 9-11
Joshua 12-15
Joshua 16-18
Joshua 19-21
Joshua 22-24
Judges 1-2
Judges 3-5
Judges 6-7
Judges 8-9
Judges 10-12
Judges 13-15
Judges 16-18
Judges 19-21
Ruth
1 Samuel 1-3
1 Samuel 4-8
1 Samuel 9-12
1 Samuel 13-14
1 Samuel 15-17
1 Samuel 18-20; Psalms 11, 59
1 Samuel 21-24; Psalm 91
Psalms 7, 27, 31, 34, 52
Psalms 56, 120, 140-142
1 Samuel 25-27
Psalms 17, 35, 54, 63
1 Samuel 28-31; Psalm 18
Psalms 121, 123-125, 128-130
2 Samuel 1-4
Psalms 6, 8-10, 14, 16, 19, 21
1 Chronicles 1-2
Psalms 43-45, 49, 84-85, 87
1 Chronicles 3-5
Psalms 73, 77-78
1 Chronicles 6
Psalms 81, 88, 92-93
1 Chronicles 7-10
Psalms 102-104
2 Samuel 5; 1 Chronicles 11-12
Psalm 133
Psalms 106-107
1 Chronicles 13-16
Psalms 1-2, 15, 22-24, 47, 68
Psalms 89, 96, 100-101, 105, 132
2 Samuel 6-7; 1 Chronicles 17
Psalms 25, 29, 33, 36, 39
2 Samuel 8-9; 1 Chronicles 18
Psalms 50, 53, 60, 75
2 Samuel 10; 1 Chronicles 19; Psalm 20
Psalms 65-67, 69-70
2 Samuel 11-12; 1 Chronicles 20
Psalms 32, 51, 86, 122
2 Samuel 13-15
Psalms 3-4, 12-13, 28, 55
2 Samuel 16-18
Psalms 26, 40, 58, 61-62, 64
2 Samuel 19-21
Psalms 5, 38, 41-42
2 Samuel 22-23; Psalm 57
Psalms 95, 97-99
2 Samuel 24; 1 Chronicles 21-22; Psalm 30
Psalms 108-110
1 Chronicles 23-25
Psalms 131, 138-139, 143-145
1 Chronicles 26-29; Psalm 127
Psalms 111-118
1 Kings 1-2; Psalms 37, 71, 94
Psalm 119
1 Kings 3-4
2 Chronicles 1; Psalm 72
Song of Solomon
Proverbs 1-3
Proverbs 4-6
Proverbs 7-9
Proverbs 10-12
Proverbs 13-15
Proverbs 16-18
Proverbs 19-21
Proverbs 22-24
1 Kings 5-6; 2 Chronicles 2-3
1 Kings 7; 2 Chronicles 4
1 Kings 8; 2 Chronicles 5
2 Chronicles 6-7; Psalm 136
Psalms 134, 146-150
1 Kings 9; 2 Chronicles 8
Proverbs 25-26
Proverbs 27-29
Ecclesiastes 1-6
Ecclesiastes 7-12
1 Kings 10-11; 2 Chronicles 9
Proverbs 30-31
1 Kings 12-14
2 Chronicles 10-12
1 Kings 15; 2 Chronicles 13-16
1 Kings 16; 2 Chronicles 17
1 Kings 17-19
1 Kings 20-21
1 Kings 22; 2 Chronicles 18
2 Chronicles 19-23
Obadiah; Psalms 82-83
2 Kings 1-4
2 Kings 5-8
2 Kings 9-11
2 Kings 12-13; 2 Chronicles 24
2 Kings 14; 2 Chronicles 25
Jonah
2 Kings 15; 2 Chronicles 26
Isaiah 1-4
Isaiah 5-8
Amos 1-5
Amos 6-9
2 Chronicles 27; Isaiah 9-12
Micah
2 Chronicles 28; 2 Kings 16-17
Isaiah 13-17
Isaiah 18-22
Isaiah 23-27
2 Kings 18; 2 Chronicles 29-31; Psalm 48
Hosea 1-7
Hosea 8-14
Isaiah 28-30
Isaiah 31-34
Isaiah 35-36
Isaiah 37-39; Psalm 76
Isaiah 40-43
Isaiah 44-48
2 Kings 19; Psalms 46, 80, 135
Isaiah 49-53
Isaiah 54-58
Isaiah 59-63
Isaiah 64-66
2 Kings 20-21
2 Chronicles 32-33
Nahum
2 Kings 22-23; 2 Chronicles 34-35
Zephaniah
Jeremiah 1-3
Jeremiah 4-6
Jeremiah 7-9
Jeremiah 10-13
Jeremiah 14-17
Jeremiah 18-22
Jeremiah 23-25
Jeremiah 26-29
Jeremiah 30-31
Jeremiah 32-34
Jeremiah 35-37
Jeremiah 38-40; Psalms 74, 79
2 Kings 24-25; 2 Chronicles 36
Habakkuk
Jeremiah 41-45
Jeremiah 46-48
Jeremiah 49-50
Jeremiah 51-52
Lamentations 1-2
Lamentations 3-5
Ezekiel 1-4
Ezekiel 5-8
Ezekiel 9-12
Ezekiel 13-15
Ezekiel 16-17
Ezekiel 18-20
Ezekiel 21-22
Ezekiel 23-24
Ezekiel 25-27
Ezekiel 28-30
Ezekiel 31-33
Ezekiel 34-36
Ezekiel 37-39
Ezekiel 40-42
Ezekiel 43-45
Ezekiel 46-48
Joel
Daniel 1-3
Daniel 4-6
Daniel 7-9
Daniel 10-12
Ezra 1-3
Ezra 4-6; Psalm 137
Haggai
Zechariah 1-4
Zechariah 5-9
Zechariah 10-14
Esther 1-5
Esther 6-10
Ezra 7-10
Nehemiah 1-5
Nehemiah 6-7
Nehemiah 8-10
Nehemiah 11-13; Psalm 126
Malachi
Luke 1; John 1
Matthew 1; Luke 2
Matthew 2
Matthew 3; Mark 1; Luke 3
Matthew 4; Luke 4-5
John 2-4
Matthew 8; Mark 2
John 5
Matthew 12; Mark 3; Luke 6
Matthew 5-7
Matthew 9; Luke 7
Matthew 11
Luke 11
Matthew 13; Luke 8
Mark 4-5
Matthew 10
Matthew 14; Mark 6; Luke 9
John 6
Matthew 15; Mark 7
Matthew 16; Mark 8
Matthew 17; Mark 9
Matthew 18
John 7-8
John 9-10
Luke 10
Luke 12-13
Luke 14-15
Luke 16-17
John 11
Luke 18
Matthew 19; Mark 10
Matthew 20-21
Luke 19
Mark 11; John 12
Matthew 22; Mark 12
Matthew 23; Luke 20-21
Mark 13
Matthew 24
Matthew 25
Matthew 26; Mark 14
Luke 22; John 13
John 14-17
Matthew 27; Mark 15
Luke 23; John 18-19
Matthew 28; Mark 16
Luke 24; John 20-21
Acts 1-3
Acts 4-6
Acts 7-8
Acts 9-10
Acts 11-12
Acts 13-14
James
Acts 15-16
Galatians 1-3
Galatians 4-6
Acts 17
1 Thessalonians; 2 Thessalonians
Acts 18-19
1 Corinthians 1-4
1 Corinthians 5-8
1 Corinthians 9-11
1 Corinthians 12-14
1 Corinthians 15-16
2 Corinthians 1-4
2 Corinthians 5-9
2 Corinthians 10-13
Romans 1-3
Romans 4-7
Romans 8-10
Romans 11-13
Romans 14-16
Acts 20-23
Acts 24-26
Acts 27-28
Colossians; Philemon
Ephesians
Philippians
1 Timothy
Titus
1 Peter
Hebrews 1-6
Hebrews 7-10
Hebrews 11-13
2 Timothy
2 Peter; Jude
1 John
2 John; 3 John
Revelation 1-5
Revelation 6-11
Revelation 12-18
Revelation 19-22
`.trim().split('\n').map((s) => s.trim());

export const PLAN_LENGTH = RAW_PLAN.length; // 365
export const START_DAY_NUMBER = 153; // Song of Solomon — where the user's plan picks up
export const START_DATE = '2026-07-20'; // calendar date that Day 153 lands on

// Standard chapter counts for every book, used to expand whole-book references
// ("Ruth", "Song of Solomon", "James"...) that the source plan lists with no chapter numbers.
const BOOK_CHAPTER_COUNTS = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Jeremiah: 52,
  Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3, Amos: 9,
  Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3,
  Haggai: 2, Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24,
  John: 21, Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13,
  Galatians: 6, Ephesians: 6, Philippians: 4, Colossians: 4,
  '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4,
  Titus: 3, Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
};

// How each book should be displayed — the user calls it "Song of Songs", so that's
// what the dashboard shows even though the source plan (and this data) says "Song of Solomon".
const DISPLAY_NAME_OVERRIDES = {
  'Song of Solomon': 'Song of Songs',
};

// Longest-name-first so "Song of Solomon" matches before a bare "Solomon" would (it never
// would here, but the same principle matters for "1 Samuel" vs "Samuel"-style collisions).
const BOOK_NAMES = Object.keys(BOOK_CHAPTER_COUNTS).sort((a, b) => b.length - a.length);
const PSALM_ALIASES = { Psalm: 'Psalms', Psalms: 'Psalms' };

function matchBookAtStart(token) {
  const trimmed = token.trim();
  for (const alias of Object.keys(PSALM_ALIASES)) {
    if (trimmed === alias || trimmed.startsWith(alias + ' ')) {
      return { book: PSALM_ALIASES[alias], rest: trimmed.slice(alias.length).trim() };
    }
  }
  for (const name of BOOK_NAMES) {
    if (trimmed === name || trimmed.startsWith(name + ' ')) {
      return { book: name, rest: trimmed.slice(name.length).trim() };
    }
  }
  return null;
}

function expandChapterSpec(book, spec) {
  const chapters = [];
  if (!spec) {
    const total = BOOK_CHAPTER_COUNTS[book];
    for (let c = 1; c <= total; c++) chapters.push(c);
    return chapters;
  }
  for (const piece of spec.split(',')) {
    const p = piece.trim();
    if (!p) continue;
    if (p.includes('-')) {
      const [start, end] = p.split('-').map((n) => parseInt(n, 10));
      for (let c = start; c <= end; c++) chapters.push(c);
    } else {
      chapters.push(parseInt(p, 10));
    }
  }
  return chapters;
}

// Turns a raw day string like "1 Samuel 18-20; Psalms 11, 59" into a flat list of
// individually-checkable chapter references.
export function expandDayReading(dayNumber) {
  const raw = RAW_PLAN[dayNumber - 1];
  if (!raw) return [];
  const refs = [];
  let currentBook = null;
  for (const segment of raw.split(';')) {
    for (const token of segment.split(',')) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      const match = matchBookAtStart(trimmed);
      if (match) {
        currentBook = match.book;
        for (const ch of expandChapterSpec(match.book, match.rest)) {
          refs.push(chapterRef(match.book, ch));
        }
      } else if (currentBook) {
        for (const ch of expandChapterSpec(currentBook, trimmed)) {
          refs.push(chapterRef(currentBook, ch));
        }
      }
    }
  }
  return refs;
}

function chapterRef(book, chapter) {
  const display = DISPLAY_NAME_OVERRIDES[book] || book;
  return { book, chapter, key: `${book} ${chapter}`, label: `${display} ${chapter}` };
}

export function getRawDayLabel(dayNumber) {
  const raw = RAW_PLAN[dayNumber - 1] || '';
  let display = raw;
  for (const [from, to] of Object.entries(DISPLAY_NAME_OVERRIDES)) {
    display = display.replace(from, to);
  }
  return display;
}

// Day number for "today" if nothing has been logged yet — anchored to START_DATE/START_DAY_NUMBER,
// then wrapped into the 1..365 range. Once the user starts marking days complete, their saved
// progress (not today's calendar date) drives which day is "current" — see lib/storage.js.
export function anchorDayNumberForDate(dateStr) {
  const start = new Date(START_DATE + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target - start) / 86400000);
  let day = ((START_DAY_NUMBER - 1 + diffDays) % PLAN_LENGTH) + 1;
  if (day < 1) day += PLAN_LENGTH;
  return day;
}
