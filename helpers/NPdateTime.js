// @flow
//-------------------------------------------------------------------------------
// Date functions that rely on NotePlan functions/types
// @jgclark except where shown

import moment from 'moment/min/moment-with-locales'
import { format, add, eachWeekOfInterval } from 'date-fns'
import { trimAnyQuotes } from './dataManipulation'
import { RE_YYYYMMDD_DATE, RE_NP_MONTH_SPEC, RE_NP_QUARTER_SPEC, getWeek, todaysDateISOString, toISOShortDateTimeString, isoWeekStartEndDates, RE_DATE } from './dateTime'
import { logDebug, logError, logWarn, clo, JSP } from './dev'
// import { getSetting } from './NPConfiguration'
// import { chooseOption, getInput } from './userInput'

//--------------------------------------------------------------------------------
// Local copies of other helpers to avoid circular dependencies

type Option<T> = $ReadOnly<{ label: string, value: T }>

/**
 * Ask user to choose from a set of options (from nmn.sweep) using CommandBar.
 * From helpers/userInput.js
 */
async function chooseOption<T, TDefault = T>(message: string, options: $ReadOnlyArray<Option<T>>, defaultValue: TDefault | null = null): Promise<T | TDefault> {
  const { index } = await CommandBar.showOptions(
    options.map((option) => option.label),
    message,
  )
  return options[index]?.value ?? defaultValue ?? options[0].value
}

/**
 * Ask user to give arbitary input using CommandBar.
 * From helpers/userInput.js
*/
async function getInput(message: string, okLabel: string = 'OK', dialogTitle: string = 'Enter value', defaultValue: string = ''): Promise<false | string> {
  if (typeof CommandBar.textPrompt === 'function') {
    // i.e. do we have .textPrompt available?
    return await CommandBar.textPrompt(dialogTitle, message, defaultValue)
  } else {
    return await CommandBar.showInput(message, okLabel)
  }
}

//--------------------------------------------------------------------------------

// TODO: work out how to test these next few functions
export function setMomentLocaleFromEnvironment(): void {
  // logDebug('NPdateTime', `NP reports languageCode = ${NotePlan.environment.languageCode ?? '<not set>'}`)
  // logDebug('NPdateTime', `NP reports regionCode   = ${NotePlan.environment.regionCode ?? '<not set>'}`)
  // Locale-specific date + time formats
  // Set locale for moment library
  const userLocaleSetting = `${NotePlan.environment.languageCode}${NotePlan.environment.regionCode ? '-' + NotePlan.environment.regionCode : ''}`
  moment.locale(userLocaleSetting)
  logDebug('NPdateTime', `locale for moment library is now ${moment.locale()}`)
}

export function nowLocaleShortDateTime(): string {
  setMomentLocaleFromEnvironment()
  return moment().format('L LT')
}
export function nowLocaleDate(): string {
  setMomentLocaleFromEnvironment()
  return moment().format('L')
}
export function nowLocaleShortTime(): string {
  setMomentLocaleFromEnvironment()
  return moment().format('LT')
}

// TODO: Finish moving references to this file from dateTime.js
// TODO: Or can this now be deprecated in favour of newer functions above?
export function toLocaleDateTimeString(dateObj: Date, locale: string | Array<string> = [], options: Intl$DateTimeFormatOptions = {}): string {
  /**
   * TODO: use details from NotePlan.environment...
   *  "languageCode": "en",
   *   "regionCode": "GB",
   *   "is12hFormat": 0,
   *   "preferredLanguages": [
   *     "en-GB"
   *   ],
   */
  return dateObj.toLocaleString(locale, options)
}
export const nowLocaleDateTime: string = moment().toDate().toLocaleString()

export function localeDateStr(dateIn: Date): string {
  setMomentLocaleFromEnvironment()
  return moment(dateIn).format('L')
}

// TODO: Finish moving references to this file from dateTime.js
// TODO: Or can this now be deprecated in favour of newer functions above?
export function toLocaleDateString(dateObj: Date, locale: string | Array<string> = [], options: Intl$DateTimeFormatOptions = {}): string {
  /**
   * TODO: use details from NotePlan.environment...
   *  "languageCode": "en",
   *   "regionCode": "GB",
   *   "preferredLanguages": [
   *     "en-GB"
   *   ],
   */
  return dateObj.toLocaleDateString(locale, options)
}

// TODO: Finish moving references to this file from dateTime.js
// TODO: Or can this now be deprecated in favour of newer functions above?
export function toLocaleTime(dateObj: Date, locale: string | Array<string> = [], options: Intl$DateTimeFormatOptions = {}): string {
  /**
   * TODO: use details from NotePlan.environment...
   *  "languageCode": "en",
   *   "regionCode": "GB",
   *   "is12hFormat": 0,
   *   "preferredLanguages": [
   *     "en-GB"
   *   ],
   */
  return dateObj.toLocaleTimeString(locale, options)
}

export function printDateRange(dr: DateRange) {
  console.log(`DateRange <${toISOShortDateTimeString(dr.start)} - ${toISOShortDateTimeString(dr.end)}>`)
}

/**
 * Return quarter start and end dates for a given quarter
 * TODO: write tests for this function. Then:
 * TODO: change to use date arithmetic in moment library and move to dateTime.js
 * @param {number} qtr - quarter number in year (1-4)
 * @param {number} year - year (4-digits)
 * @returns {[Date, Date]}} - start and end dates (as JS Dates)
 */
export function quarterStartEnd(qtr: number, year: number): [Date, Date] {
  // Default values are needed to account for the
  // default case of the switch statement below.
  // Otherwise, these variables will never get initialized before
  // being used.
  let startDate: Date = new Date()
  let endDate: Date = new Date()

  // Because this seems to use ISO dates, we appear to need to take timezone
  // offset into account in order to avoid landing up crossing date boundaries.
  // I.e. when in BST (=UTC+0100) it's calculating dates which are often 1 too early.
  // Get TZOffset in minutes. If positive then behind UTC; if negative then ahead.
  const TZOffset = new Date().getTimezoneOffset()

  switch (qtr) {
    case 1: {
      startDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 1, 1, 0, 0, 0), 'minute', -TZOffset)
      endDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 3, 31, 0, 0, 0), 'minute', -TZOffset)
      break
    }
    case 2: {
      startDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 4, 1, 0, 0, 0), 'minute', -TZOffset)
      endDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 6, 30, 0, 0, 0), 'minute', -TZOffset)
      break
    }
    case 3: {
      startDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 7, 1, 0, 0, 0), 'minute', -TZOffset)
      endDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 9, 30, 0, 0, 0), 'minute', -TZOffset)
      break
    }
    case 4: {
      startDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 10, 1, 0, 0, 0), 'minute', -TZOffset)
      endDate = Calendar.addUnitToDate(Calendar.dateFrom(year, 12, 31, 0, 0, 0), 'minute', -TZOffset)
      break
    }
    default: {
      console.log(`error: invalid quarter given: ${qtr}`)
      break
    }
  }
  return [startDate, endDate]
}

/**
 * Returns the user's chosen day of the week in the specified date according to UTC, where 0 represents Sunday.
 * @author @jgclark
 * @returns {number}
 */
export function getUsersFirstDayOfWeekUTC(): number {
  // Get user preference for start of week.
  // In NP this is Sunday = 1 ...Sat = 6.  Can also be undefined -> 1.
  return typeof DataStore.preference('firstDayOfWeek') === 'number' ? Number(DataStore.preference('firstDayOfWeek')) - 1 : 1
}

// TODO: Use moment instead ... and make locale aware
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthsAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function monthNameAbbrev(m: number): string {
  return monthsAbbrev[m - 1]
}

/**
 * Array of period types and their descriptions, as used by getPeriodStartEndDates() when we need to ask user for a period.
 * (Not dependent on NotePlan functions, but easier to keep it with the function that uses it.)
 */
export const periodTypesAndDescriptions = [
  {
    label: 'Last Week',
    value: 'lw',
  },
  {
    label: 'This week (so far)',
    value: 'userwtd',
  },
  {
    label: 'Other Week',
    value: 'ow',
  },
  {
    label: 'Last Month',
    value: 'lm',
  },
  {
    label: 'This Month (to date)',
    value: 'mtd',
  },
  {
    label: 'Other Month',
    value: 'om',
  },
  {
    label: 'Last Quarter',
    value: 'lq',
  },
  {
    label: 'This Quarter (to date)',
    value: 'qtd',
  },
  {
    label: 'Other Quarter',
    value: 'oq',
  },
  {
    label: 'Last Year',
    value: 'ly',
  },
  {
    label: 'Year to date',
    value: 'ytd',
  },
  {
    label: 'Other Year',
    value: 'oy',
  },
]

/**
 * Get a time period from 'periodTypesAndDescriptions' (e.g. 'Last Quarter') and returns a set of details for it:
 * - {Date} start (js) date of time period
 * - {Date} end (js) date of time period
 * - {string} periodType    (e.g. 'lq' for 'Last Quarter')
 * - {string} periodString  (e.g. '2022 Q2 (Apr-June)')
 * - {string} periodAndPartStr (e.g. 'day 4' showing how far through we are in a partial ('... to date') time period)
 * Normally does this by asking user, unless param 'periodType' is supplied.
 * @author @jgclark
 *
 * @param {string?} question to show user
 * @param {boolean?} excludeToday? (default true)
 * @param {string?} periodType? if not provided ask user
 * @returns {[Date, Date, string, string, string]}
 */
export async function getPeriodStartEndDates(
  question: string = 'Create stats for which period?',
  excludeToday: boolean = true /* currently only used when a date is passed through as periodTypeToUse */,
  periodTypeToUse?: string,
): Promise<[Date, Date, string, string, string]> {
  let periodType: string
  // If we're passed the period, then use that, otherwise ask user
  if (periodTypeToUse) {
    // It may come with surrounding quotes, so remove those
    periodType = trimAnyQuotes(periodTypeToUse)
  } else {
    // Ask user what date interval to do tag counts for
    periodType = await chooseOption(question, periodTypesAndDescriptions, 'mtd')
  }
  let fromDateMom = new moment()
  let fromDate: Date = fromDateMom.toDate()
  let toDateMom = new moment()
  let toDate: Date = toDateMom.toDate()
  let periodString = ''
  let periodAndPartStr = ''

  const todaysDate = toDateMom.toDate()
  // couldn't get const { y, m, d } = getYearMonthDate(todaysDate) to work ??
  const y = todaysDate.getFullYear()
  const m = todaysDate.getMonth() + 1 // so we can count from 1
  const d = todaysDate.getDate()

  // We appear to need to take timezone offset into account in order to avoid landing
  // up crossing date boundaries.
  // I.e. when in BST (=UTC+0100) it's calculating dates which are often 1 too early.
  // Get TZOffset in minutes. If positive then behind UTC; if negative then ahead.
  // TODO: ideally use moment library instead, which should make this easier
  const TZOffset = new Date().getTimezoneOffset()
  logDebug('getPeriodStartEndDates', `starting with periodType = ${periodType}, TZOffset = ${TZOffset}, excludeToday? ${String(excludeToday)}.`)

  switch (periodType) {
    case 'lm': {
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(y, m, 1, 0, 0, 0), 'minute', -TZOffset) // go to start of this month
      // fromDate = Calendar.addUnitToDate(fromDate, 'month', -1) // -1 month
      // toDate = Calendar.addUnitToDate(fromDate, 'month', 1) // + 1 month
      // const theY = m > 1 ? y : y - 1
      // periodString = `${monthNameAbbrev(fromDate.getMonth() + 1)} ${theY}`
      // Now use moment instead:
      fromDateMom = fromDateMom.subtract(1, 'month').startOf('month') //.subtract(6, 'days')
      fromDate = fromDateMom.toDate()
      toDateMom = moment(toDate).startOf('month').subtract(1, 'days')
      toDate = toDateMom.toDate()
      periodString = fromDateMom.format('MMM YYYY')
      break
    }
    case 'mtd': {
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(y, m, 1, 0, 0, 0), 'minute', -TZOffset) // start of this month
      // toDate = Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset)
      // periodString = `${monthNameAbbrev(m)} ${y}`
      // periodAndPartStr = `${periodString}, day ${d}`

      // Now use moment instead
      fromDateMom = moment(toDate).startOf('month')
      fromDate = fromDateMom.toDate()
      periodString = fromDateMom.format('MMM YYYY')
      periodAndPartStr = `${periodString}, day ${d}`
      break
    }
    case 'om': {
      const theY = Number(await getInput(`Choose year, e.g. ${y}`, 'OK', 'Counts for Month', String(y)))
      const theM = Number(await getInput('Choose month, (1-12)', 'OK', 'Counts for Month'))
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(theY, theM, 1, 0, 0, 0), 'minute', -TZOffset) // start of this month
      // toDate = Calendar.addUnitToDate(fromDate, 'month', 1) // + 1 month
      // toDate = Calendar.addUnitToDate(toDate, 'day', -1) // -1 day, to get last day of last month
      // periodString = `${monthNameAbbrev(theM)} ${theY}`

      // Now use moment instead:
      fromDateMom = moment({ year: theY, month: theM - 1, day: 1 })
      toDateMom = moment(fromDateMom).endOf('month') // have to clone otherwise fromDateMom mutates
      // logDebug('', `om: ${fromDateMom.format()} - ${toDateMom.format()}`)
      fromDate = fromDateMom.toDate()
      toDate = toDateMom.toDate()
      periodString = fromDateMom.format('MMM YYYY')
      break
    }

    case 'lq': {
      // const thisQ = Math.floor((m - 1) / 3) + 1 // quarter (1-4)
      // const theQ = thisQ > 1 ? thisQ - 1 : 4 // last quarter (1-4)
      // const theY = theQ === 4 ? y - 1 : y // change the year if we want Q4
      // const [f, t] = quarterStartEnd(theQ, theY)
      // fromDate = f
      // toDate = t
      // const theQStartMonth = (theQ - 1) * 3 + 1
      // toDate = Calendar.addUnitToDate(fromDate, 'month', 3) // +1 quarter
      // toDate = Calendar.addUnitToDate(toDate, 'day', -1) // -1 day, to get last day of last month
      // periodString = `${theY} Q${theQ} (${monthNameAbbrev(theQStartMonth)}-${monthNameAbbrev(theQStartMonth + 2)})`

      // Now use moment instead:
      fromDateMom = moment().startOf('quarter').subtract(1, 'quarter')
      toDateMom = moment(fromDateMom).endOf('quarter') // have to clone otherwise
      fromDate = fromDateMom.toDate()
      toDate = toDateMom.toDate()
      periodString = fromDateMom.format('YYYY [Q]Q (MMM-') + toDateMom.format('MMM)')
      break
    }
    case 'qtd': {
      // const thisQ = Math.floor((m - 1) / 3) + 1
      // const thisQStartMonth = (thisQ - 1) * 3 + 1
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(y, thisQStartMonth, 1, 0, 0, 0), 'minute', -TZOffset) // start of this quarter
      // toDate = Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset)
      // periodString = `${y} Q${thisQ} (${monthNameAbbrev(thisQStartMonth)}-${monthNameAbbrev(thisQStartMonth + 2)})`
      // periodAndPartStr = `${periodString} (to ${todaysDateISOString})`

      // Now use moment instead
      fromDateMom = moment(toDate).startOf('quarter')
      fromDate = fromDateMom.toDate()
      periodString = fromDateMom.format('YYYY [Q]Q')
      periodAndPartStr = `${periodString} (to ${todaysDateISOString})`
      break
    }
    case 'oq': {
      const theY = Number(await getInput(`Choose year, e.g. ${y}`, 'OK', 'Counts for Quarter', String(y)))
      const theQ = Number(await getInput('Choose quarter, (1-4)', 'OK', 'Counts for Quarter'))
      const theQStartMonth = (theQ - 1) * 3 + 1
      // const [f, t] = quarterStartEnd(theQ, theY)
      // fromDate = f
      // toDate = t
      // toDate = Calendar.addUnitToDate(fromDate, 'month', 3) // +1 quarter
      // toDate = Calendar.addUnitToDate(toDate, 'day', -1) // -1 day, to get last day of last month
      // periodString = `${theY} Q${theQ} (${monthNameAbbrev(theQStartMonth)}-${monthNameAbbrev(theQStartMonth + 2)})`

      // Now use moment instead:
      fromDateMom = moment({ year: theY, month: theQStartMonth - 1, day: 1 })
      toDateMom = moment(fromDateMom).endOf('quarter') // have to clone otherwise fromDateMom mutates
      fromDate = fromDateMom.toDate()
      toDate = toDateMom.toDate()
      periodString = fromDateMom.format('YYYY [Q]Q (MMM-') + toDateMom.format('MMM)')
      break
    }

    case 'lw': {
      // last week, using ISO 8601 date definition, which always starts on a Monday
      let theYear = y
      const currentWeekNum = getWeek(todaysDate)
      // First deal with edge case: after start of ordinal year but before first week starts
      if (currentWeekNum === 52 && m === 1) {
        theYear -= 1
      }
      let lastWeekNum = 0
      if (currentWeekNum === 1) {
        lastWeekNum = 52
        theYear--
      } else {
        lastWeekNum = currentWeekNum - 1
      }
      ;[fromDate, toDate] = isoWeekStartEndDates(lastWeekNum, theYear)
      periodString = `${String(theYear)}-W${lastWeekNum < 10 ? '0' + String(lastWeekNum) : String(lastWeekNum)}`
      break
    }
    case 'userwtd': {
      // week to date from user's chosen Week Start (in app settings)
      const dayOfWeekWithSundayZero = new Date().getDay()
      // Get user preference for start of week, with Sunday = 0 ...
      const usersStartOfWeekWithSundayZero = getUsersFirstDayOfWeekUTC()
      // Work out day number (1..7) within user's week
      const dateWithinInterval = ((dayOfWeekWithSundayZero + 7 - usersStartOfWeekWithSundayZero) % 7) + 1
      logDebug(
        'getPeriodStartEndDates',
        `userwtd: dayOfWeekWithSundayZero: ${dayOfWeekWithSundayZero}, usersStartOfWeekWithSundayZero: ${usersStartOfWeekWithSundayZero}, dateWithinInterval: ${dateWithinInterval}`,
      )
      fromDate = Calendar.startOfWeek(new Date()) //Calendar.addUnitToDate(Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset), 'day', -(dateWithinInterval - 1))
      toDate = Calendar.addUnitToDate(fromDate, 'day', dateWithinInterval - 1) // Eduard, 3rd March '23: week to date means the start of the week till today? Before it went till the end.
      logDebug(
        'getPeriodStartEndDates',
        `fromDate: ${String(fromDate)}, ${String(toDate)}`,
      )

      periodString = `this week`
      periodAndPartStr = `at day ${dateWithinInterval} of this week`
      break
    }
    case 'wtd': {
      // week to date, using ISO 8601 date definition, which always starts on a Monday
      let theYear = y
      const currentWeekNum = getWeek(todaysDate)
      // First deal with edge case: after start of ordinal year but before first week starts
      if (currentWeekNum === 52 && m === 1) {
        theYear -= 1
      }
      // I don't know why the [from, to] construct doesn't work here, but using tempObj instead
      const tempObj = isoWeekStartEndDates(currentWeekNum, theYear)
      fromDate = tempObj[0]
      toDate = tempObj[1]
      periodString = `${theYear}-W${currentWeekNum < 10 ? '0' + String(currentWeekNum) : String(currentWeekNum)}`
      // get ISO dayOfWeek (Monday = 1 to Sunday = 7)
      const todaysISODayOfWeek = moment().isoWeekday()
      periodAndPartStr = `day ${todaysISODayOfWeek}, ${periodString}`
      // logDebug('getPeriodStartEndDates', `wtd: currentWeekNum: ${currentWeekNum}, theYear: ${theYear}, todaysISODayOfWeek: ${todaysISODayOfWeek}`)
      break
    }
    case 'last7d': {
      // last 7 days, including today
      // now using Moment library
      periodString = `last 7 days`
      periodAndPartStr = ``
      // fromDate = Calendar.addUnitToDate(Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset), 'day', -6)
      // toDate = Calendar.addUnitToDate(fromDate, 'day', 6)
      toDateMom = moment(toDate).startOf('day')
      fromDateMom = toDateMom.subtract(6, 'days')
      fromDate = fromDateMom.toDate()
      logDebug('last7d', `${fromDateMom.toLocaleString()} - ${toDateMom.toLocaleString()}}`)
      break
    }
    case 'last2w': {
      // last 2 weeks, including today
      // now using Moment library
      periodString = `last 2 weeks`
      periodAndPartStr = ``
      // fromDate = Calendar.addUnitToDate(Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset), 'day', -13)
      // toDate = Calendar.addUnitToDate(fromDate, 'day', 13)
      toDateMom = moment(toDate).startOf('day')
      fromDateMom = toDateMom.subtract(13, 'days')
      fromDate = fromDateMom.toDate()
      // logDebug('last2w', `${fromDateMom.toLocaleString()} - ${toDateMom.toLocaleString()}}`)
      break
    }
    case 'last4w': {
      // last 4 weeks, including today
      // now using Moment library
      periodString = `last 4 weeks`
      periodAndPartStr = ``
      // fromDate = Calendar.addUnitToDate(Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset), 'day', -27)
      // toDate = Calendar.addUnitToDate(fromDate, 'day', 27)
      toDateMom = moment(toDate).startOf('day')
      fromDateMom = moment(toDateMom).subtract(27, 'days')
      fromDate = fromDateMom.toDate()
      // logDebug('last4w', `${fromDateMom.toLocaleString()} - ${toDateMom.toLocaleString()}}`)
      break
    }
    case 'ow': {
      // other week
      const theYear = Number(await getInput(`Choose year, e.g. ${y}`, 'OK', 'Counts for Week', String(y)))
      const weekNum = Number(await getInput('Choose week number, 1-53', 'OK', 'Counts for Week'))
      // I don't know why the [from, to] form doesn't work here, but using tempObj instead
      const tempObj = isoWeekStartEndDates(weekNum, theYear)
      fromDate = tempObj[0]
      toDate = tempObj[1]
      periodString = `${theYear}-W${weekNum < 10 ? '0' + String(weekNum) : String(weekNum)}`
      break
    }

    case 'ly': {
      const lastY = y - 1
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(lastY, 1, 1, 0, 0, 0), 'minute', -TZOffset)
      // toDate = Calendar.addUnitToDate(Calendar.dateFrom(lastY, 12, 31, 0, 0, 0), 'minute', -TZOffset)

      // Now use moment instead:
      fromDateMom = moment().startOf('year').subtract(1, 'year')
      toDateMom = moment(fromDateMom).endOf('year')
      fromDate = fromDateMom.toDate()
      toDate = toDateMom.toDate()
      periodString = `${lastY}`
      break
    }
    case 'ytd': {
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(y, 1, 1, 0, 0, 0), 'minute', -TZOffset) // start of this year
      // toDate = Calendar.addUnitToDate(Calendar.dateFrom(y, m, d, 0, 0, 0), 'minute', -TZOffset)
      // Now use moment instead:
      fromDateMom = moment().startOf('year')
      fromDate = fromDateMom.toDate()
      periodString = `${y}`
      periodAndPartStr = `${periodString} (to ${todaysDateISOString})`
      break
    }
    case 'oy': {
      const theYear = Number(await getInput(`Choose year, e.g. ${y}`, 'OK', 'Counts for Year', String(y)))
      // fromDate = Calendar.addUnitToDate(Calendar.dateFrom(theYear, 1, 1, 0, 0, 0), 'minute', -TZOffset) // start of this year
      // toDate = Calendar.addUnitToDate(Calendar.dateFrom(theYear, 12, 31, 0, 0, 0), 'minute', -TZOffset)
      // Now use moment instead:
      fromDateMom = moment({ year: theYear, month: 0, day: 1 })
      toDateMom = moment(fromDateMom).endOf('year')
      fromDate = fromDateMom.toDate()
      toDate = toDateMom.toDate()
      periodString = `${theYear}`
      break
    }
    default: {
      // check to see if it's an ISO8601 date instead
      if (new RegExp(`^${RE_DATE}$`).test(periodType)) {
        toDateMom = moment(toDate).startOf('day')
        fromDateMom = moment(periodType)
        fromDate = fromDateMom.toDate()
        periodString = `since ${periodType}`
        const daysBetween = toDateMom.diff(fromDateMom, 'days')
        periodAndPartStr = `${daysBetween} days since ${periodType}`
        logDebug('getPeriodStartEndDates 8601date', `${fromDateMom.toLocaleString()} - ${toDateMom.toLocaleString()}}`)
        break
      }
      periodString = `<Error: couldn't parse interval type '${periodType}'>`
    }
  }
  if (excludeToday) {
    logDebug('getPeriodStartEndDates', `- as requested, today's date will be excluded`)
    toDateMom = moment(toDate).subtract(1, 'day')
    toDate = toDateMom.toDate()
  }
  logDebug('getPeriodStartEndDates', `-> ${fromDate.toString()}, ${toDate.toString()}, ${periodString} / ${periodAndPartStr}`)
  return [fromDate, toDate, periodType, periodString, periodAndPartStr]
}

export type NotePlanWeekInfo = {
  weekNumber: number,
  weekYear: number,
  weekString: string,
  startDate: Date,
  endDate: Date,
  date: Date,
}

export type NotePlanMonthInfo = {
  monthIndex: number /* 0-indexed */,
  monthString: number /* 2022-01 (1-indexed) */,
  startDate: Date,
  endDate: Date,
}

export type NotePlanQuarterInfo = {
  quarterIndex: number /* 0-indexed */,
  quarterString: number /* 2022-Q1 (1-indexed) */,
  startDate: Date,
  endDate: Date,
}

export type NotePlanYearInfo = {
  yearString: number /* 2022 */,
  startDate: Date,
  endDate: Date,
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : n
}

/**
 * Get all the week details for a given unhyphenated|hyphenated(ISO8601) date string or a Date object
 * Week info is offset depending on the NotePlan setting for the first day of the week
 * @param {string} date - date string in format YYYY-MM-DD OR a Date object (default = today).
 *    NOTE:
 *    Make sure that if you send in a date that it's a date in the correct time/timezone you want.
 *    If you create a new date of your own without a time (e.g. new Date("2022-01-01")) it could produce a date
 *    in a previous or next day depending on your timezone. So if you are creating the date, just send through
 *    the date string rather than a date object
 * @param {number} offsetIncrement - number of days|weeks|month to add (or negative=subtract) to date (default: 0)
 * @param {string} offsetType - the increment to add/subtract: 'day'|'week'|'month'|'year' (default: 'week')
 * @returns { NotePlanWeekInfo } - an object with all the week details
 * getNPWeekData: alias weekInfo, weekData, getWeek, weeklyNote
 * {
 *   weekNumber: number, // e.g. 1
 *   weekYear: number, // e.g. 2022
 *   weekString: string, // e.g. 2022-W01
 *   startDate: Date,
 *   endDate: Date,
 *   date: Date,
 * }
 * @author @dwertheimer
 * @test - available in jest file
 */
export function getNPWeekData(dateIn: string | Date = new Date(), offsetIncrement: number = 0, offsetType: string = 'week'): NotePlanWeekInfo | null {
  let dateStrFormat = 'YYYY-MM-DD',
    newMom
  if (typeof dateIn === 'string') {
    if (new RegExp(RE_YYYYMMDD_DATE).test(dateIn)) dateStrFormat = 'YYYYMMDD'
    newMom = moment(dateIn, dateStrFormat).add(offsetIncrement, offsetType)
  } else {
    newMom = moment(dateIn).add(offsetIncrement, offsetType)
  }
  if (newMom) {
    const date = newMom.toDate()
    if (date) {
      const weekNumber = Calendar.weekNumber(date)
      const startDate = Calendar.startOfWeek(date)
      const endDate = Calendar.endOfWeek(date)
      const weekStartYear = startDate.getFullYear()
      const weekEndYear = endDate.getFullYear()
      const weekYear = weekStartYear === weekEndYear ? weekStartYear : weekNumber === 1 ? weekEndYear : weekStartYear
      const weekString = `${weekYear}-W${pad(weekNumber)}`
      return { weekNumber, startDate, endDate, weekYear, date, weekString }
    }
  }
  return null
}

/**
 * Get all the month details for a given unhyphenated|hyphenated(ISO8601) date string or a Date object
 * NOTE: Returns results in local timezone (which is good), but make sure you expect that!
 * @param {string | Date} dateIn
 * @param {number} offsetIncrement (optional) - number of days|weeks|month to add (or negative=subtract) to date (default: 0)
 * @param {string} offsetType (optional) - the increment to add/subtract: 'day'|'week'|'month'|'year' (default: 'month'
 * @returns {
    monthIndex: number; /* 0-indexed
    monthString: number; e.g. 2022-01 (1-indexed)
    startDate: Date; // start of month (date object in your local timezone -- could be another day in GMT)
    endDate: Date; // end of month (date object in your local timezone -- could be another day in GMT)
}
 */
export function getMonthData(dateIn: string | Date = new Date(), offsetIncrement: number = 0, offsetType: string = 'month'): NotePlanMonthInfo | null {
  let dateStrFormat = 'YYYY-MM-DD',
    newMom
  if (typeof dateIn === 'string') {
    if (new RegExp(RE_YYYYMMDD_DATE).test(dateIn)) dateStrFormat = 'YYYYMMDD'
    if (new RegExp(RE_NP_MONTH_SPEC).test(dateIn)) dateStrFormat = 'YYYY-MM'
    newMom = moment(dateIn, dateStrFormat).add(offsetIncrement, offsetType)
  } else {
    newMom = moment(dateIn).add(offsetIncrement, offsetType)
  }
  if (newMom) {
    const monthIndex = newMom.month()
    const monthString = newMom.format('YYYY-MM')
    const startDate = newMom.startOf('month').toDate()
    const endDate = newMom.endOf('month').toDate()

    return { monthIndex, monthString, startDate, endDate }
  }
  return null
}

/**
 * Get all the year details for a given unhyphenated|hyphenated(ISO8601) date string or a Date object
 * NOTE: Returns results in local timezone (which is good), but make sure you expect that!
 * @param {string | Date} dateIn
 * @param {number} offsetIncrement (optional) - number of days|weeks|month to add (or negative=subtract) to date (default: 0)
 * @param {string} offsetType (optional) - the increment to add/subtract: 'day'|'week'|'month'|'year' (default: 'month'
 * @returns {
  yearString: number /* 2022 ,
  startDate: Date,
  endDate: Date,
  }
*/
export function getYearData(dateIn: string | Date = new Date(), offsetIncrement: number = 0, offsetType: string = 'year'): NotePlanYearInfo | null {
  let dateStrFormat = 'YYYY',
    newMom
  if (typeof dateIn === 'string') {
    if (new RegExp(RE_YYYYMMDD_DATE).test(dateIn)) dateStrFormat = 'YYYYMMDD'
    if (new RegExp(RE_DATE).test(dateIn)) dateStrFormat = 'YYYY-MM-DD'
    if (new RegExp(RE_NP_MONTH_SPEC).test(dateIn)) dateStrFormat = 'YYYY-MM'
    newMom = moment(dateIn, dateStrFormat).add(offsetIncrement, offsetType)
  } else {
    newMom = moment(dateIn).add(offsetIncrement, offsetType)
  }
  if (newMom) {
    const yearString = newMom.format('YYYY')
    const startDate = newMom.startOf('year').toDate()
    const endDate = newMom.endOf('year').toDate()

    return { yearString, startDate, endDate }
  }
  return null
}

/**
 * Get all the month details for a given unhyphenated|hyphenated(ISO8601) date string or a Date object
 * NOTE: Returns results in local timezone (which is good), but make sure you expect that!
 * @param {string | Date} dateIn
 * @param {number} offsetIncrement (optional) - number of days|weeks|month to add (or negative=subtract) to date (default: 0)
 * @param {string} offsetType (optional) - the increment to add/subtract: 'day'|'week'|'month'|'year' (default: 'month'
 * @returns {
  quarterIndex: number  0-indexed ,
  quarterString: number 2022-Q1 (1-indexed) ,
  startDate: Date,
  endDate: Date,
}
 */
export function getQuarterData(dateIn: string | Date = new Date(), offsetIncrement: number = 0, offsetType: string = 'quarter'): NotePlanQuarterInfo | null {
  let dateStrFormat = 'YYYY-[Q]Q',
    newMom
  if (typeof dateIn === 'string') {
    if (new RegExp(RE_YYYYMMDD_DATE).test(dateIn)) dateStrFormat = 'YYYYMMDD'
    if (new RegExp(RE_DATE).test(dateIn)) dateStrFormat = 'YYYY-MM-DD'
    if (new RegExp(RE_NP_QUARTER_SPEC).test(dateIn)) dateStrFormat = 'YYYY-[Q]Q'
    newMom = moment(dateIn, dateStrFormat).add(offsetIncrement, offsetType)
  } else {
    newMom = moment(dateIn).add(offsetIncrement, offsetType)
  }
  if (newMom) {
    const quarterIndex = newMom.quarter()
    const quarterString = newMom.format('YYYY-[Q]Q')
    const startDate = newMom.startOf('quarter').toDate()
    const endDate = newMom.endOf('quarter').toDate()

    return { quarterIndex, quarterString, startDate, endDate }
  }
  return null
}
/**
 * Get upcoming date string options for use in chooseOption
 * Note: the day-specific version of this function is in ./dateTime (getDateOptions)
 * uses date-fns:
 * - formats: https://date-fns.org/v2.29.2/docs/format
 * - add:https://date-fns.org/v2.29.2/docs/add
 * @author: @dwertheimer
 */
export function getWeekOptions(): $ReadOnlyArray<{ label: string, value: string }> {
  const now = new moment().toDate() // use moment instead of  `new Date` to ensure we get a date in the local timezone
  const formats = {
    withDay: ' (EEE, yyyy-MM-dd)',
    noDay: 'yyyy-MM-dd',
    arrowDay: '>yyyy-MM-dd',
    arrowISOWeek: '>yyyy[W]II',
  }
  // const thisWeek = { date: now, start: startOfISOWeek(now), end: endOfISOWeek(now) }
  const weeks = eachWeekOfInterval({ start: now, end: add(now, { months: 6 }) })
  const weekOpts = weeks?.length
    ? weeks.map((w) => {
        const weekData = getNPWeekData(w)
        if (weekData) {
          const start = weekData.startDate
          const end = weekData.endDate
          const arrowWeek = `>${weekData.weekString}`
          const arrowWeekLabel = `>${weekData.weekString} Weekly Note`
          return {
            label: `${arrowWeekLabel} (${format(start, formats.noDay)} - ${format(end, formats.noDay)})`,
            // $FlowIgnore
            value: arrowWeek,
          }
        }
      })
    : []
  if (weekOpts && weekOpts?.length && weekOpts[0]?.label && weekOpts[1]?.label) {
    const extras = [
      { ...weekOpts[0], ...{ label: `>thisweek -- ${weekOpts[0].label}` } },
      { ...weekOpts[1], ...{ label: `>nextweek -- ${weekOpts[1].label}` } },
    ]
    // clo(options, `getDateOptions: options=`)
    // $FlowIgnore
    return [...extras, ...weekOpts]
  }
  return []
}

/**
 * Return relative string version of difference between date and today, using locale-aware formatting provided by moment library, as picked up by NP environment.
 * Returns just the most significant unit ("in 2 months", "a week ago" etc.)
 * Note: uses the moment library (instead of my original), but if 'useShortStyle' set then tweaks output slightly (in English), to match my original.
 * Note: non-locale original version at dateTime::relativeDateFromNumber()
 * @author @jgclark
 * @param {number} diffIn - number of days difference (positive or negative)
 * @param {boolean?} shortStyle?
 * @returns {string} - relative date string in locale picked up from NP environment (e.g. today, 3w ago, 2m, 4y ago.)
 */
export function localeRelativeDateFromNumber(diffIn: number, useShortStyle: boolean = false): string {
  if (diffIn == null || diffIn === undefined || isNaN(diffIn)) {
    logWarn('NPdateTime / localeRelativeDateFromNumber', `diffIn param is undefined`)
    return 'unknown date'
  }
  // Set locale for moment from NP environment
  setMomentLocaleFromEnvironment()
  const todayMom = moment().startOf('day')
  let output = diffIn < 0 ? todayMom.add(diffIn, 'days').fromNow() : diffIn === 0 ? 'today' : todayMom.add(diffIn, 'days').fromNow()
  output = output.replace(/month[s]/, 'mon') // shorten 'months' -> 'mon' (in English)
  if (useShortStyle) {
    // Shorten output (in English)
    output = output
      .replace(/ year[s]/, 'y')
      .replace(/ month[s]/, 'm')
      .replace(/ week[s]/, 'w')
      .replace(/ day[s]/, 'd')
  }
  // logDebug('NPdateTime / localeRelativeDateFromNumber', `--> ${output}`)
  return output
}

/**
 * Get array of relative dates for day, week and month.
 * @author @jgclark
 * @returns {Object} relative date name, relative date string, TNote for that relative date
 */
export function getRelativeDates(): Array<Object> {
  try {
    let relativeDates = []
    const todayMom = moment()

    // Calculate relative dates. Remember to clone todayMom first as moments aren't immutable
    let thisDateStr = moment(todayMom).format('YYYYMMDD')
    relativeDates.push({ relName: 'today', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).subtract(1, 'days').startOf('day').format('YYYYMMDD')
    relativeDates.push({ relName: 'yesterday', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).add(1, 'days').startOf('day').format('YYYYMMDD')
    relativeDates.push({ relName: 'tomorrow', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })

    // can't start with moment as NP weeks count differently
    // $FlowIgnore[incompatible-type]
    let thisNPWeekInfo: NotePlanWeekInfo = getNPWeekData(new Date())
    thisDateStr = thisNPWeekInfo.weekString
    relativeDates.push({ relName: 'this week', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    // $FlowIgnore[incompatible-type]
    thisNPWeekInfo = getNPWeekData(new Date(), -1)
    // $FlowIgnore[incompatible-use]
    thisDateStr = thisNPWeekInfo.weekString
    relativeDates.push({ relName: 'last week', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    // $FlowIgnore[incompatible-type]
    thisNPWeekInfo = getNPWeekData(new Date(), 1)
    // $FlowIgnore[incompatible-use]
    thisDateStr = thisNPWeekInfo.weekString
    relativeDates.push({ relName: 'next week', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })

    thisDateStr = moment(todayMom).startOf('month').format('YYYY-MM')
    relativeDates.push({ relName: 'this month', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).subtract(1, 'month').startOf('month').format('YYYY-MM')
    relativeDates.push({ relName: 'last month', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).add(1, 'month').startOf('month').format('YYYY-MM')
    relativeDates.push({ relName: 'next month', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })

    thisDateStr = moment(todayMom).startOf('quarter').format('YYYY-[Q]Q')
    relativeDates.push({ relName: 'this quarter', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).subtract(1, 'quarter').startOf('quarter').format('YYYY-[Q]Q')
    relativeDates.push({ relName: 'last quarter', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })
    thisDateStr = moment(todayMom).add(1, 'quarter').startOf('quarter').format('YYYY-[Q]Q')
    relativeDates.push({ relName: 'next quarter', dateStr: thisDateStr, note: DataStore.calendarNoteByDateString(thisDateStr) })

    // for (const rd of relativeDates) {
    //   const noteTitle = (rd.note) ? displayTitle(rd.note) : '(error)'
    //   logDebug('getRelativeDates', `${rd.name ?? ''}: ${rd.dateStr ?? ''} / ${noteTitle}`)
    // }
    return relativeDates
  } catch (err) {
    logError('getRelativeDates', `${err.name}: ${err.message}`)
    return [{}] // for completeness
  }
}
