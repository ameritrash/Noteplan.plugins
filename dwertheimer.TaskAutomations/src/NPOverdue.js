// @flow

import pluginJson from '../plugin.json'
import { showMessageYesNo, chooseFolder, showMessage, chooseOptionWithModifiers } from '../../helpers/userInput'
import { reviewTasksInNotes, getNotesAndTasksToReview, createArrayOfNotesAndTasks } from './NPTaskScanAndProcess'
import { JSP, clo, log, logError, logWarn, logDebug } from '@helpers/dev'
import { filenameDateString, isScheduled } from '@helpers/dateTime'
import { getTodaysReferences } from '@helpers/NPnote'
import { /* getTasksByType, */ sortListBy } from '@helpers/sorting'
import { filterNotesAgainstExcludeFolders } from '@helpers/note'

/**
 * After an overdue task scan is complete,
 * ask user if they want to review all the items marked for >today or today's date
 * Plugin entrypoint for command: "/COMMAND"
 * @param {*} incoming
 */
export async function askToReviewTodaysTasks(byTask: boolean = false) {
  try {
    const { askToReviewTodaysTasks } = DataStore.settings
    if (askToReviewTodaysTasks) {
      await Editor.openNoteByDate(new Date())
      const answer = await showMessageYesNo("Do you want to review today's tasks?", ['Yes', 'No'], "Review Today's Tasks", true)
      if (answer === 'Yes') {
        logDebug(pluginJson, `askToReviewTodaysTasks: now launching review of today's tasks; byTask=${String(byTask)}`)
        await reviewEditorReferencedTasks(null, byTask)
      }
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * After an overdue task scan is complete,
 * ask user if they want to review all open items from previous calendar notes
 * Plugin entrypoint for command: "/COMMAND"
 * @param {*} incoming
 */
export async function askToReviewForgottenTasks(byTask: boolean = false) {
  try {
    const { askToReviewForgottenTasks } = DataStore.settings
    if (askToReviewForgottenTasks) {
      await Editor.openNoteByDate(new Date())
      let answer = await showMessageYesNo('Do you want to review (potentially forgotten) tasks from previous Calendar days?', ['Yes', 'No'], "Review Today's Tasks", true)
      if (answer === 'Yes') {
        answer = await showMessageYesNo('Ignore items which have dates/are scheduled?', ['Yes', 'No'], "Review Today's Tasks", true)
        logDebug(pluginJson, `askToReviewForgottenTasks: now launching review of today's tasks; byTask=${String(byTask)}`)
        await searchForOpenTasks(null, byTask, answer === 'Yes')
      }
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update date+ tags
 * (plugin entry point for "/Update >date+ tags in Notes")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function updateDatePlusTags(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `updateDatePlusTags: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { datePlusOpenOnly, datePlusFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const options = {
      openOnly: datePlusOpenOnly,
      foldersToIgnore: datePlusFoldersToIgnore,
      datePlusOnly: true,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: false,
      noteTaskList: null,
      noteFolder: false,
      replaceDate,
      overdueOnly: true,
    }
    const notesToReview = getNotesAndTasksToReview(options)
    await reviewTasksInNotes(notesToReview, options)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+
 * DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Note)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksByNote(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksByNote: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      noteTaskList: null,
      noteFolder: false,
      replaceDate,
      overdueOnly: true,
    }
    const notesToReview = getNotesAndTasksToReview(options)
    await reviewTasksInNotes(notesToReview, options)
    await askToReviewTodaysTasks(false)
    await askToReviewForgottenTasks(false)
    await showMessage(`Review Complete!`, 'OK', 'Task Review', true)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Task)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksByTask(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksByTask: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: false,
      noteFolder: false,
      noteTaskList: null,
      replaceDate,
      overdueOnly: true,
    }
    const notesToReview = getNotesAndTasksToReview(options)
    await reviewTasksInNotes(notesToReview, options)
    await askToReviewTodaysTasks(true)
    await askToReviewForgottenTasks(true)
    await showMessage(`Review Complete!`, 'OK', 'Task Review', true)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+ in Active Note in Editor
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Task)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksInNote(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksInNote: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      replaceDate,
      noteFolder: false,
      noteTaskList: Editor.note?.datedTodos?.length ? Editor.note?.datedTodos : [],
      overdueOnly: true,
    }
    // $FlowIgnore
    const notesToReview = getNotesAndTasksToReview(options)
    await reviewTasksInNotes(notesToReview, options)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 *  Find all tasks in today's references (e.g. >dated today or >today)
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review/Reschedule Tasks Dated Today")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewEditorReferencedTasks(incoming: string | null = null, byTask: boolean = true): Promise<void> {
  try {
    await Editor.openNoteByDate(new Date())
    logDebug(pluginJson, `reviewEditorReferencedTasks: incoming="${incoming || ''}" typeof=${typeof incoming}`)
    if (Editor.note?.type !== 'Calendar') {
      await showMessage(`You must be in a Calendar Note to run this command.`)
      return
    }
    // clo(getTodaysReferences(Editor.note), `reviewEditorReferencedTasks todayReferences`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const refs = getTodaysReferences(Editor.note)
    logDebug(pluginJson, `reviewEditorReferencedTasks refs.length=${refs.length}`)
    const openTasks = refs.filter((p) => p.type === 'open' && p.content !== '') //TODO: confirm with users that open-only is OK for this command
    logDebug(pluginJson, `reviewEditorReferencedTasks openTasks.length=${openTasks.length}`)
    // gather references by note
    const arrayOfOpenNotesAndTasks = createArrayOfNotesAndTasks(openTasks)
    // clo(arrayOfNotesAndTasks, `NPOverdue::reviewEditorReferencedTasks arrayOfNotesAndTasks`)
    logDebug(pluginJson, `reviewEditorReferencedTasks arrayOfNotesAndTasks.length=${arrayOfOpenNotesAndTasks.length}`)
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: !byTask,
      replaceDate,
      noteFolder: false,
      noteTaskList: arrayOfOpenNotesAndTasks,
      overdueOnly: false,
    }
    // const notesToReview = getNotesAndTasksToReview(options) //FIXME I AM HERE! maybe can skip this step because of REFACTORING
    await reviewTasksInNotes(arrayOfOpenNotesAndTasks, options)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+ in a folder chosen by user
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks in <Choose Folder>")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksInFolder(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksInFolder: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      replaceDate,
      noteTaskList: null,
      noteFolder: await chooseFolder('Choose Folder to Search for Overdue Tasks'),
      overdueOnly: true,
    }
    const notesToReview = getNotesAndTasksToReview(options)
    await reviewTasksInNotes(notesToReview, options)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 *
 * @param {Array<Note>} notes -- array of notes to review
 * @param {*} sortOrder -- sort order for notes (not implemented yet)
 * @param {*} ignoreScheduledTasks - don't show scheduled tasks
 * @returns {Promise<Array<Array<TParagraph>>>} - array of tasks to review, grouped by note
 */
export async function getOpenTasksByNote(
  notes: Array<Note>,
  sortOrder: string | Array<string> | null = null,
  ignoreScheduledTasks: boolean = true,
): Promise<Array<Array<TParagraph>>> {
  CommandBar.showLoading(true, `Searching for open tasks...`)
  await CommandBar.onAsyncThread()
  let notesWithOpenTasks = []
  for (const note of notes) {
    CommandBar.showLoading(true, `Searching for open tasks...\n${note.title || ''}`)
    const paras = note.paragraphs
    let hasOpens = false

    const openTasks = []
    for (let index = 0; index < paras.length; index++) {
      const p = paras[index]
      if (p.type === 'open' && p.content.trim() !== '' && (!ignoreScheduledTasks || !(ignoreScheduledTasks && isScheduled(p.content)))) {
        logDebug(pluginJson, `getOpenTasksByNote: Including note: "${note.title || ''}" and task: "${p.content}".`)
        openTasks.push(p)
      }
    }
    if (openTasks.length) notesWithOpenTasks.push(openTasks)
  }
  if (sortOrder) {
    // searchForgottenTasksOldestToNewest //FIXME: I am here
    const mapForSorting = notesWithOpenTasks.reduce((acc, n, i) => {
      acc?.push({ filename: n[0].filename, changedDate: n[0].note?.changedDate, index: i, item: n })
      return acc
    }, [])
    notesWithOpenTasks = sortListBy(mapForSorting, sortOrder).map((i) => i.item)
  }
  return notesWithOpenTasks
}

/**
 * For Open task search, ask the user what notes to get and return an array of notes to review
 * @param {*} incoming
 */
export async function getNotesToReviewForOpenTasks(ignoreScheduledTasks: boolean = true): Promise<Array<Array<TParagraph>> | false> {
  try {
    const { searchForgottenTasksOldestToNewest, overdueFoldersToIgnore } = DataStore.settings

    const OPTIONS = [
      { label: '1 day', value: { num: 1, unit: 'day' } },
      { label: '7 days', value: { num: 7, unit: 'day' } },
      { label: '14 days', value: { num: 14, unit: 'day' } },
      { label: '1 month', value: { num: 1, unit: 'month' } },
      { label: '3 months', value: { num: 3, unit: 'month' } },
      { label: '6 months', value: { num: 6, unit: 'month' } },
      { label: '1 year', value: { num: 1, unit: 'year' } },
      { label: 'All Time', value: { num: 99, unit: 'year' } },
      { label: '(opt-click to include Project Notes for period)', value: { num: -1, unit: 'day' } },
      // { label: '21 days', value: { num: 21, unit: 'day' } },
      // { label: '❌ Cancel', value: { num: -1, unit: 'day' } },
    ]
    // const DEFAULT_OPTION: Option1 = { unit: 'day', num: 0 }
    const history = await chooseOptionWithModifiers<Option1>('Review Calendar Note Tasks From the Last...', OPTIONS)
    if (!history || history.num === -1) return false
    const { value, keyModifiers } = history
    const { num, unit } = value
    const afterDate = Calendar.addUnitToDate(new Date(), unit, -num)
    logDebug(pluginJson, `afterdate=${afterDate.toString()}`)
    const afterDateFileName = filenameDateString(Calendar.addUnitToDate(new Date(), unit, -num))
    logDebug(pluginJson, `afterDateFileName=${afterDateFileName}`)
    const todayFileName = `${filenameDateString(new Date())}.${DataStore.defaultFileExtension}`
    logDebug(pluginJson, `todayFileName=${todayFileName}`)
    // Calendar Notes
    let recentCalNotes = DataStore.calendarNotes.filter((note) => note.filename < todayFileName && note.filename >= afterDateFileName)
    logDebug(pluginJson, `Calendar Notes in date range: ${recentCalNotes.length}`)
    recentCalNotes = filterNotesAgainstExcludeFolders(recentCalNotes, overdueFoldersToIgnore, true)
    logDebug(pluginJson, `Calendar Notes after exclude folder filter: ${recentCalNotes.length}`)
    // Project Notes
    let recentProjNotes = []
    if (keyModifiers.indexOf('opt') > -1) {
      recentProjNotes = DataStore.projectNotes.filter((note) => note.changedDate >= afterDate)
      logDebug(pluginJson, `Project Notes in date range: ${recentProjNotes.length}`)
      recentProjNotes = filterNotesAgainstExcludeFolders(recentProjNotes, overdueFoldersToIgnore, true)
      logDebug(pluginJson, `Project Notes after exclude folder filter: ${recentProjNotes.length}`)
    }

    // sort  // TODO: test/check sort option - searchForgottenTasksOldestToNewest
    recentCalNotes = await getOpenTasksByNote(recentCalNotes, searchForgottenTasksOldestToNewest ? 'filename' : '-filename', ignoreScheduledTasks)
    recentProjNotes = await getOpenTasksByNote(recentProjNotes, searchForgottenTasksOldestToNewest ? 'changedDate' : '-changedDate', ignoreScheduledTasks)
    logDebug(pluginJson, `Calendar Notes after filtering for open tasks: ${recentCalNotes.length}`)
    logDebug(pluginJson, `Project Notes after filtering for open tasks: ${recentProjNotes.length}`)

    const notesWithOpenTasks = [...recentCalNotes, ...recentProjNotes]

    await CommandBar.onMainThread()
    CommandBar.showLoading(false)
    const totalTasks = notesWithOpenTasks.reduce((acc, n) => acc + n.length, 0)
    logDebug(pluginJson, `Calendar + Project Notes to review: ${notesWithOpenTasks.length}; total tasks: ${totalTasks}`)
    return notesWithOpenTasks
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Search for open tasks in Calendar and Project notes
 * Plugin entrypoint for command: "/Search Forgotten Tasks Oldest to Newest"
 * @param {*} incoming
 */
export async function searchForOpenTasks(incoming: string | null = null, byTask: boolean = false, ignoreScheduledTasks: boolean = true) {
  try {
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const notes = await getNotesToReviewForOpenTasks(ignoreScheduledTasks)
    if (!notes) throw new Error('Canceled by user')
    if (!notes.length) {
      await showMessage('No open tasks in that timeframe!', 'OK', 'Open Tasks', true)
      return
    }
    const options = {
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: true,
      showUpdatedTask,
      showNote: !byTask,
      replaceDate,
      noteTaskList: null,
      noteFolder: false,
      overdueOnly: true,
    }
    await reviewTasksInNotes(notes, options)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}