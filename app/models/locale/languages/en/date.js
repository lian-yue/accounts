export default {
  diff: {
    second: '{value} second{where(value, >, "1", "s")}',
    minute: '{value} minute{where(value, >, "1", "s")}',
    hour: '{value} hour{where(value, >, "1", "s")}',
    day: '{value} day{where(value, >, "1", "s")}',
    week: '{value} week{where(value, >, "1", "s")}',
    month: '{value} month{where(value, >, "1", "s")}',
    year: '{value} year{where(value, >, "1", "s")}',

    before: '{value} ago',
    after: '{value} later',
  },

  formats: {
    w3c: '{YYYY}-{MM}-{DD}T{hh}:{mm}:{ss}T{ZZ}',


    lastDay: 'Yesterday at {HH}:{mm} {a}',
    sameDay: 'Today at {HH}:{mm} {a}',
    nextDay: 'Tomorrow at {HH}:{mm} {a}',

    lastWeek: 'Last {ddd} at {HH}:{mm} {a}',
    sameWeek: '{ddd} at {HH}:{mm} {a}',
    nextWeek: 'Next {ddd} at {HH}:{mm} {a}',

    calendar: '{MMM} {DD},{YYYY} at {H}:{mm}{a}',
  },

  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],


  monthsShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],

  weeksDay: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],

  weeksDayShort: [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ],

  meridiem: {
    12: 'am',
    24: 'pm',
  },
}
