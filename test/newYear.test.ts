import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isNewYearMinute } from '../src/webview/newYear';

describe('new year party', () => {
  // Dates are built in local time, the same clock the pond uses.
  const at = (month: number, day: number, h: number, m: number, s = 0) => new Date(2027, month, day, h, m, s);

  it('starts at midnight on January 1st and lasts one minute', () => {
    assert.equal(isNewYearMinute(at(0, 1, 0, 0, 0)), true);
    assert.equal(isNewYearMinute(at(0, 1, 0, 0, 59)), true);
    assert.equal(isNewYearMinute(at(0, 1, 0, 1, 0)), false);
  });

  it("doesn't start on New Year's Eve, at noon, or on other midnights", () => {
    assert.equal(isNewYearMinute(at(11, 31, 23, 59, 59)), false);
    assert.equal(isNewYearMinute(at(0, 1, 12, 0)), false);
    assert.equal(isNewYearMinute(at(1, 1, 0, 0)), false);
  });
});
