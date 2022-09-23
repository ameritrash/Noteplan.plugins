// @flow
// ---------------------------------------------------------
// HTML helper functions for use with HTMLView API
// by @jgclark
// Last updated 16.9.2022
// ---------------------------------------------------------

import { clo, logDebug, logError, logWarn } from '@helpers/dev'
// import { getOrMakeNote } from '@helpers/note'
const pluginJson = 'helpers/HTMLView'

let baseFontSize = 14

/**
 * Generate CSS instructions from the given theme (or current one if not given)
 * to use as an embedded style sheet
 * @author @jgclark
 * @param {string?} themeNameIn
 * @returns {string} outputCSS
 */
// $FlowIgnore[incompatible-return]
export function generateCSSFromTheme(themeNameIn: string = ''): string {
  try {
    let themeName = ''
    let themeJSON: Object
    if (NotePlan.environment.buildVersion > 849) {
      logDebug('generateCSSFromTheme', `Current theme = '${String(Editor.currentTheme.name)}', mode '${String(Editor.currentTheme.mode)}'`)

      // log list of available themes
      const availableThemeNames = Editor.availableThemes.map((m) => (m.name.endsWith('.json') ? m.name.slice(0, -5) : m.name))
      logDebug('generateCSSFromTheme', availableThemeNames.toString())

      // if themeName is blank, then use Editor.currentTheme
      themeName = themeNameIn && themeNameIn !== '' ? themeNameIn : Editor.currentTheme.name

      if (!availableThemeNames.includes(themeName)) {
        logError('generateCSSFromTheme', `Theme '${themeName}' is not in list of available themes. Stopping`)
        return ''
      }
    } else {
      // if themeName is blank, then use user's dark theme (which we can access before NP 3.6.2)
      themeName = themeNameIn && themeNameIn !== '' ? themeNameIn : String(DataStore.preference('themeDark'))
    }

    // try simplest way first (for NP b850+)
    themeName = Editor.currentTheme.name
    logDebug('generateCSSFromTheme', `Reading theme '${themeName}'`)

    // eslint-disable-next-line prefer-const
    themeJSON = Editor.currentTheme.values

    // TODO: allow for specified theme, not just current one
    // logDebug('generateCSSFromTheme', `Reading theme '${themeName}'`)
    // const relativeThemeFilepath = `../../../Themes/${themeName}.json` // TODO: will need updating
    // const themeJSON = DataStore.loadJSON(relativeThemeFilepath)
    // const themeJSON = availableThemes

    // Check we can proceed
    if (themeJSON == null || themeJSON.length === 0) {
      logError('generateCSSFromTheme', `themeJSON is empty. Stopping.`)
      return ''
    }

    //-----------------------------------------------------
    // Calculate the CSS properties for various selectors
    const output: Array<string> = []
    let tempSel = []
    const rootSel = [] // for special :root selector which sets variables picked up in several places below
    let styleObj: Object

    // Set 'html':
    // - main font size
    // set global variable
    baseFontSize = Number(DataStore.preference('fontSize')) ?? 14
    // tempSel.push(`color: ${themeJSON.styles.body.color}` ?? "#DAE3E8")
    tempSel.push(`background: ${themeJSON.editor.backgroundColor}` ?? '#1D1E1F')
    output.push(makeCSSSelector('html', tempSel))
    // rootSel.push(`--fg-main-color: ${themeJSON.styles.body.color}` ?? "#DAE3E8")
    rootSel.push(`--bg-main-color: ${themeJSON.editor.backgroundColor}` ?? '#1D1E1F')

    // Set body:
    // - main font = styles.body.font)
    // const bodyFont = translateFontNameNPToCSS(themeJSON.styles.body.font)
    // - main foreground colour (styles.body.color)
    // - main background colour (editor.backgroundColor)
    tempSel = []
    styleObj = themeJSON.styles.body
    if (styleObj) {
      const thisColor = RGBColourConvert(themeJSON.editor.textColor) ?? '#CC6666'
      tempSel.push(`color: ${thisColor}`)
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('body', tempSel))
      rootSel.push(`--fg-main-color: ${RGBColourConvert(themeJSON.editor.textColor)}` ?? '#CC6666')
    }

    // Set H1 (styles.title1)
    tempSel = []
    styleObj = themeJSON.styles.title1
    if (styleObj) {
      const thisColor = RGBColourConvert(themeJSON.styles.title1.color) ?? '#CC6666'
      tempSel.push(`color: ${thisColor}`)
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('h1', tempSel))
      rootSel.push(`--h1-color: ${thisColor}`)
    }
    // Set H2 similarly:
    tempSel = []
    styleObj = themeJSON.styles.title2
    if (styleObj) {
      const thisColor = RGBColourConvert(themeJSON.styles.title2.color) ?? '#E9C062'
      tempSel.push(`color: ${thisColor}`)
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('h2', tempSel))
      rootSel.push(`--h2-color: ${thisColor}`)
    }
    // Set H3 similarly:
    tempSel = []
    styleObj = themeJSON.styles.title3
    if (styleObj) {
      const thisColor = RGBColourConvert(themeJSON.styles.title3.color) ?? '#E9C062'
      tempSel.push(`color: ${thisColor}`)
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('h3', tempSel))
      rootSel.push(`--h3-color: ${thisColor}`)
    }
    // Set H4 similarly:
    tempSel = []
    styleObj = themeJSON.styles.title4
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(themeJSON.styles.title4.color)}` ?? '#E9C062')
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('h4', tempSel))
    }
    // NP doesn't support H5 styling

    // Set core table features from theme:
    const altColor = RGBColourConvert(themeJSON.editor?.altBackgroundColor) ?? '#2E2F30'
    output.push(makeCSSSelector('tr:nth-child(even)', [`background-color: ${altColor}`]))
    output.push(makeCSSSelector('th', [`background-color: ${altColor}`]))
    rootSel.push(`--bg-alt-color: ${altColor}`)
    const tintColor = RGBColourConvert(themeJSON.editor?.tintColor) ?? '#E9C0A2'
    output.push(makeCSSSelector('table tbody tr:first-child', [`border-top: 1px solid ${tintColor}`]))
    output.push(makeCSSSelector('table tbody tr:last-child', [`border-bottom: 1px solid ${RGBColourConvert(themeJSON.editor?.tintColor)}` ?? '1px solid #E9C0A2']))
    rootSel.push(`--tint-color: ${tintColor}`)

    // Set bold text if present
    tempSel = []
    styleObj = themeJSON.styles.bold
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(styleObj.color)}` ?? '#CC6666') // FIXME:
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('b', tempSel))
    }
    // Set italic text if present
    tempSel = []
    styleObj = themeJSON.styles.italic
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(styleObj.color)}` ?? '#96CBFE') // FIXME:
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('i', tempSel))
    }
    // Can't easily set bold-italic in CSS ...

    // Set class for completed tasks ('checked') if present
    tempSel = []
    styleObj = themeJSON.styles.checked
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(styleObj.color)}` ?? '#9DC777')
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('.task-checked', tempSel))
    }

    // Set class for cancelled tasks ('checked-canceled') if present
    // following is workaround in object handling as 'checked-canceled' JSON property has a dash in it
    tempSel = []
    styleObj = themeJSON.styles['checked-canceled']
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(styleObj.color)}` ?? '#9DC777')
      tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
      output.push(makeCSSSelector('.task-cancelled', tempSel))
    }

    // Set class for scheduled tasks ('checked-scheduled') if present
    // following is workaround in object handling as 'checked-canceled' JSON property has a dash in it
    tempSel = []
    styleObj = themeJSON.styles['checked-scheduled']
    if (styleObj) {
      tempSel.push(`color: ${RGBColourConvert(styleObj.color)}` ?? '#9DC777')
    }
    tempSel = tempSel.concat(convertStyleObjectBlock(styleObj))
    output.push(makeCSSSelector('.task-scheduled', tempSel))

    // Now put the important info and rootSel at the start of the output
    output.unshift(makeCSSSelector(':root', rootSel))
    output.unshift(`/* Generated by @jgclark's translateFontNameNPToCSS from NotePlan theme '${themeName}' by jgc */`)

    logDebug('generateCSSFromTheme', `Generated CSS:\n${output.join('\n')}`)
    return output.join('\n')
  } catch (error) {
    logError('generateCSSFromTheme', error.message)
  }
}

/**
 * Convert NotePlan Theme style information to CSS equivalent(s)
 * @author @jgclark
 * @param {Object} style object from JSON theme
 * @returns {Array} CSS elements
 */
function convertStyleObjectBlock(styleObject: any): Array<string> {
  let cssStyleLinesOutput: Array<string> = []
  if (styleObject?.size) {
    cssStyleLinesOutput.push(`font-size: ${pxToRem(styleObject?.size, baseFontSize)}`)
  }
  if (styleObject?.paragraphSpacingBefore) {
    cssStyleLinesOutput.push(`line-height: ${pxToRem(styleObject?.paragraphSpacingBefore, baseFontSize)}`)
    // `padding-top: ${themeJSON.styles.body.paragraphSpacingBefore}` ?? "0" + 'px', // TODO:
  }
  if (styleObject?.paragraphSpacing) {
    cssStyleLinesOutput.push(`padding-bottom: ${pxToRem(styleObject?.paragraphSpacing, baseFontSize)}`)
    // `padding-bottom: ${themeJSON.styles.body.paragraphSpacing}` ?? "6" + 'px', // TODO:
  }
  if (styleObject?.font) {
    cssStyleLinesOutput = cssStyleLinesOutput.concat(fontPropertiesFromNP(styleObject?.font))
  }
  if (styleObject?.strikethroughStyle) {
    cssStyleLinesOutput.push(textDecorationFromNP('strikethroughStyle', Number(styleObject?.strikethroughStyle)))
  }
  if (styleObject?.underlineStyle) {
    cssStyleLinesOutput.push(textDecorationFromNP('underlineStyle', Number(styleObject?.underlineStyle)))
  }
  return cssStyleLinesOutput
}

/**
 * Convert NP strikethrough/underline styling to CSS setting (or empty string if none)
 * Full details at https://help.noteplan.co/article/48-strikethrough-underline-styles
 * @author @jgclark
 * @param {string} selector to use from NP
 * @param {number} value to use from NP
 * @returns {string} CSS setting to return
 */
export function textDecorationFromNP(selector: string, value: number): string {
  // logDebug('textDecorationFromNP', `starting for ${selector} / ${value}`)
  if (selector === 'underlineStyle') {
    switch (value) {
      case 1: {
        return 'text-decoration: underline'
      }
      case 9: {
        // double
        return 'text-decoration: underline double'
      }
      case 513: {
        // dashed
        return 'text-decoration: underline dashed'
      }
      default: {
        logWarn('textDecorationFromNP', `No matching CSS found for underline style value '${value}'`)
        return ''
      }
    }
  } else if (selector === 'strikethroughStyle') {
    switch (value) {
      case 1: {
        return "text-decoration: line-through"
      }
      case 9: { // double
        return "text-decoration: line-through double"
      }
      case 513: { // dashed
        return "text-decoration: line-through dashed"
      }
      default: {
        logWarn('textDecorationFromNP', `No matching CSS found for style strikethrough value '${value}'`)
        return ""
      }
    }
  } else {
    logWarn('textDecorationFromNP', `No matching CSS found for style setting "${selector}"`)
    return ''
  }
}

/**
 * Convert a font size (in px) to rem (as a string).
 * Uses the NP theme's baseFontSize (in px) to be the basis for 1.0rem.
 * @param {number} thisFontSize
 * @param {number} baseFontSize
 * @returns {string} size including 'rem' units
 */
function pxToRem(thisFontSize: number, baseFontSize: number): string {
  const output = `${String((thisFontSize / baseFontSize).toPrecision(2))}rem`
  // logDebug('', `${String(thisFontSize)} -> ${output}`)
  return output
}

/**
 * Convert [A]RGB (used by NP) to RGB[A] (CSS)
 * @param {string} #[A]RGB
 * @returns {string} #RGB[A]
 */
function RGBColourConvert(RGBIn: string): string {
  // default to just passing the colour through, unless
  // we have ARGB, so need to switch things round
  let output = RGBIn
  if (RGBIn.match(/#[0-9A-Fa-f]{8}/)) {
    output = `#${RGBIn.slice(7, 9)}${RGBIn.slice(1, 7)}`
  }
  return output
}

/**
 * Translate from the font name, as used in the NP Theme file,
 * to the form CSS is expecting.
 * If no translation is defined, try to use the user's own default font.
 * If that fails, use fallback font 'sans'.
 * Further info at https://help.noteplan.co/article/44-customize-themes#fonts
 * @author @jgclark
 * @param {string} fontNameNP
 * @returns {Array<string>} resulting CSS font properties
 */
export function fontPropertiesFromNP(fontNameNP: string): Array<string> {
  const specialFontList = new Map()
  // lookup list of special cases
  specialFontList.set('System', ['sans', 'regular', 'normal'])
  specialFontList.set('', ['sans', 'regular', 'normal'])
  specialFontList.set('noteplanstate', ['noteplanstate', 'regular', 'normal'])

  const outputArr = []

  // First test to see if this is one of the specials
  const specials = specialFontList.get(fontNameNP) // or undefined if none match
  if (specials !== undefined) {
    outputArr.push(`font-family: "${specials[0]}"`)
    outputArr.push(`font-weight: "${specials[1]}"`)
    outputArr.push(`font-style: "${specials[2]}"`)
    // logDebug('translateFontNameNPToCSS', `${fontNameNP} ->  ${outputArr.toString()}`)
    logDebug(pluginJson, `specials: ${fontNameNP} ->  ${outputArr.toString()}`)
    return outputArr
  }

  // Not a special. So now split input string into parts either side of '-'
  // and then insert spaces before capital letters
  let translatedFamily: string
  let translatedWeight: string = '400'
  let translatedStyle: string = 'normal'
  const splitParts = fontNameNP.split('-')
  const namePartNoSpaces = splitParts[0]
  let namePartSpaced = ''
  const modifierLC = splitParts.length > 0 ? splitParts[1]?.toLowerCase() : ''
  for (let i = 0; i < namePartNoSpaces.length; i++) {
    const c = namePartNoSpaces[i]
    if (c.match(/[A-Z]/)) {
      namePartSpaced += ` ${c}`
    } else {
      namePartSpaced += c
    }
  }
  translatedFamily = namePartSpaced.trim()
  // logDebug('translateFontNameNPToCSS', `${fontNameNP} -> ${translatedFamily}`)

  // Using the numeric font-weight system
  // With info from https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping
  switch (modifierLC) {
    case 'thin': {
      translatedWeight = '100'
      break
    }
    case 'light': {
      translatedWeight = '300'
      break
    }
    case 'book': {
      translatedWeight = '500'
      break
    }
    case 'demi-bold': {
      translatedWeight = '600'
      break
    }
    case 'semi-bold': {
      translatedWeight = '600'
      break
    }
    case 'bold': {
      translatedWeight = '700'
      break
    }
    case 'heavy': {
      translatedWeight = '900'
      break
    }
    case 'black': {
      translatedWeight = '900'
      break
    }
    case 'italic': {
      translatedStyle = 'italic'
      break
    }
    case 'bolditalic': {
      translatedWeight = '700'
      translatedStyle = 'italic'
      break
    }
    case 'slant': {
      translatedStyle = 'italic'
      break
    }
    default: {
      // including '', 'normal' and 'regular'
      translatedWeight = '400'
      translatedStyle = 'normal'
      break
    }
  }
  // logDebug('translateFontNameNPToCSS', `  - ${translatedStyle} / ${translatedWeight}`)

  // Finally if we're still working on default 'Sans', then
  // at least try to use the user's default font setting.
  if (translatedFamily === 'Sans') {
    logDebug('fontPropertiesFromNP', `For '${fontNameNP}' trying user's default font setting`)
    const userFont: string = String(DataStore.preference('fontFamily')) ?? ''
    logDebug('fontPropertiesFromNP', `- userFont = '${userFont}'`)
    translatedFamily = userFont
  }

  outputArr.push(`font-family: "${translatedFamily}"`)
  outputArr.push(`font-weight: "${translatedWeight}"`)
  outputArr.push(`font-style: "${translatedStyle}"`)
  // logDebug('translateFontNameNPToCSS', `${fontNameNP} ->  ${outputArr.toString()}`)
  return outputArr
}

/**
 * Make a CSS selector from an array of parameters
 * @param {string} selector
 * @param {Array<string>} settingsArray
 * @returns {string} CSS selector with its various parameters
 */
function makeCSSSelector(selector: string, settingsArray: Array<string>): string {
  const outputArray = []
  outputArray.push(`\t${selector} {`)
  outputArray.push(`\t\t${settingsArray.join(';\n\t\t')}`)
  outputArray.push(`\t}`)
  return outputArray.join('\n')
}

/**
 * Helper function to construct HTML to show in a new window
 * @param {string} title of window
 * @param {string} headerTags
 * @param {string} body
 * @param {string} generalCSSIn
 * @param {string} specificCSS
 * @param {boolean} makeModal?
 * @param {string?} preBodyScript
 * @param {string?} postBodyScript
 * @param {string?} filenameForSavedFileVersion
 * @param {number?} width
 * @param {number?} height
 * TODO: Allow for style file when we can save arbitrary data files, not just read them
 */
export function showHTML(
  title: string,
  headerTags: string,
  body: string,
  generalCSSIn: string,
  specificCSS: string,
  makeModal: boolean = false,
  preBodyScript: string = '',
  postBodyScript: string = '',
  filenameForSavedFileVersion: string = '',
  width?: number,
  height?: number,
): void {
  try {
    const fullHTML = []
    fullHTML.push('<!DOCTYPE html>') // needed to let emojis work without special coding
    fullHTML.push('<html>')
    fullHTML.push('<head>')
    fullHTML.push(`<title>${title}</title>`)
    fullHTML.push(`<meta charset="utf-8">`)
    fullHTML.push(headerTags)
    fullHTML.push('<style type="text/css">')
    // If CSS is empty, then generate it from the current theme
    const generalCSS = generalCSSIn && generalCSSIn !== '' ? generalCSSIn : generateCSSFromTheme('')
    fullHTML.push(generalCSS)
    fullHTML.push(specificCSS)
    fullHTML.push('</style>')
    if (preBodyScript !== '') {
      fullHTML.push('\n')
      fullHTML.push(preBodyScript)
      fullHTML.push('\n')
    }
    fullHTML.push('</head>')
    fullHTML.push('\n<body>')
    fullHTML.push(body)
    fullHTML.push('\n</body>')
    if (postBodyScript !== '') {
      fullHTML.push('\n')
      fullHTML.push(postBodyScript)
      fullHTML.push('\n')
    }
    fullHTML.push('</html>')
    const fullHTMLStr = fullHTML.join('\n')

    // Call the appropriate function, with or without h/w params
    // TODO: Remove build 863 check in time
    if (width === undefined || height === undefined) {
      if (makeModal || NotePlan.environment.buildVersion < 863) {
        HTMLView.showSheet(fullHTMLStr) // available from 3.6.2
      } else {
        HTMLView.showWindow(fullHTMLStr, title) // available from 3.7.0
      }
    } else {
      if (makeModal) {
        HTMLView.showSheet(fullHTMLStr, width, height)
      } else {
        HTMLView.showWindow(fullHTMLStr, title, width, height)
      }
    }

    // If wanted, also write this HTML to a file so we can work on it offline.
    // Note: this is saved to the Plugins/Data/<Plugin> folder, not a user-accessible Note.
    if (filenameForSavedFileVersion !== '') {
      const filenameWithoutSpaces = filenameForSavedFileVersion.split(' ').join('')
      // Write to specified file in NP sandbox
      const res = DataStore.saveData(fullHTMLStr, filenameWithoutSpaces, true)
      if (res) {
        logDebug('showHTML', `Saved resulting HTML '${title}' to ${filenameForSavedFileVersion} as well.`)
      } else {
        logError('showHTML', `Couoldn't save resulting HTML '${title}'  to ${filenameForSavedFileVersion} as well.`)
      }
    }
  } catch (error) {
    logError('HTMLView / showHTML', error.message)
  }
}

/**
 * Draw (animated) percent ring with the number in the middle.
 * If 'textToShow' is given then use this instead of the percentage.
 * Note: harder than it looks to change text color: see my contribution at https://stackoverflow.com/questions/17466707/how-to-apply-a-color-to-a-svg-text-element/73538662#73538662 when I worked out how.
 * Note: It needs to be followed by call to JS function setPercentRing() to set the ring's state.
 * @param {number} percent 0-100
 * @param {string?} color for ring and text (as colour name or #RGB)
 * @param {string?} textToShow inside ring (which can be different from just the percent)
 * @param {ID} string identifier for this ring (unique within the HTML page)
 * @returns {string} SVG code to insert in HTML
 */
export function makeSVGPercentRing(percent: number, color: string, textToShow: string, ID: string): string {
  return `
  <svg id="pring${ID}" class="percent-ring" height="200" width="200" viewBox="0 0 100 100" onload="setPercentRing(${percent}, 'pring${ID}');">
    <circle class="percent-ring-circle" stroke="${color}" stroke-width=12% fill="transparent" r=40% cx=50% cy=50% />
    <g class="circle-percent-text" color=${color}>
    <text class="circle-percent-text" x=50% y=53% dominant-baseline="middle" text-anchor="middle" fill="currentcolor" stroke="currentcolor">${textToShow}</text>
    </g>
  </svg>\n`
}

/**
 * Create an interpolated colour from red (0%) to green (100%), passing through yellow.
 * Note: not using quite pure red to pure green, to make it less harsh, and spending more time from red to yellow than yellow to green, to make it look better.
 * Tweaked from https://stackoverflow.com/a/6394340/3238281
 * @param {number} percent 
 * @returns {string} #RRGGBB value
 */
export function redToGreenInterpolation(percent: number): string {
  // Work out colour ranges from nearly pure red to nearly full green, passing through yellow
  const red = (percent > 60 ? 1 - 2 * (percent - 60) / 100.0 : 1.0) * 223
  const green = (percent > 40 ? 1.0 : 2 * percent / 100.0) * 223
  const blue = Math.abs(50.0 - percent) // add some blue increasingly at both red and green ends
  return rgbToHex(Math.round(red), Math.round(green), Math.round(blue))
}

/**
 * Create '#RRGGBB' string from RGB values each from 0-255
 * From https://stackoverflow.com/a/5624139/3238281
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string} #RRGGBB value
 */
export function rgbToHex(r: number, g: number, b: number): string {
  // eslint-disable-next-line prefer-template
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}