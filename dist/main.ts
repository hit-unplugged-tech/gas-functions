
const doGet = () => {
  let response = ``

  const n_trigger = setTrigger()
  response += `${n_trigger}個のトリガーを設定しました。\n`

  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(response));

  return output;
}

//

const MAX_N_TRIGGER = 20

const props = PropertiesService.getScriptProperties().getProperties()
const FOLDER_ID = props.FOLDER_ID
const SLACK_BOT_TOKEN = props.SLACK_BOT_TOKEN
const SLACK_FORM_CHANNEL = props.SLACK_FORM_CHANNEL

const setTrigger = (): number => {
  const max_n_trigger = MAX_N_TRIGGER - 1
  let n_trigger = 0
  deleteAllTrigger()
  n_trigger += setFormTrigger(max_n_trigger)

  ScriptApp.newTrigger(resetTrigger.name)
    .timeBased()
    .after(24 * 60 * 60 * 1000)
    .create()
  n_trigger += 1

  return n_trigger
}

const resetTrigger = () => {
  const max_n_trigger = MAX_N_TRIGGER
  let n_trigger = 0
  deleteAllTrigger()
  n_trigger += setFormTrigger(max_n_trigger)
}

const deleteAllTrigger = () => {
  const triggers = ScriptApp.getProjectTriggers()
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i])
  }
}

const setFormTrigger = (max_n_trigger: number): number => {
  const formIdList = getAllFormIdList(FOLDER_ID)
  const n_forms = formIdList.length
  if (n_forms > max_n_trigger) {
    Logger.log(`triggerを設定できる上限を超えました。`)
    return 0
  }
  for (let i = 0; i < n_forms; i++) {
    const form = FormApp.openById(formIdList[i])
    ScriptApp.newTrigger(onFormSubmit.name)
      .forForm(form)
      .onFormSubmit()
      .create()
  }
  return n_forms
}

const onFormSubmit = (e) => {
  const formTitle = e.source.getTitle()
  const response: GoogleAppsScript.Forms.FormResponse = e.response
  const itemResponses = response.getItemResponses()


  let message = `フォーム「${formTitle}」に回答が提出されました\n`
  for (let i = 0; i < itemResponses.length; i++) {
    const title = itemResponses[i].getItem().getTitle()
    const response = itemResponses[i].getResponse()
    message += `Q${i + 1}: ${title}\nA${i + 1}: ${response}\n`
  }
  postSlackMessage(message)
}

const getAllFormIdList = (folderId: string): string[] => {
  const folder = DriveApp.getFolderById(folderId)

  // @ts-ignore
  return getAllFileIdByType(folder, MimeType.GOOGLE_FORMS)
}

const getAllFileIdByType = (targetFolder: GoogleAppsScript.Drive.Folder, fileType: string): string[] => {
  let fileIdList: string[] = []

  const files = targetFolder.getFilesByType(fileType)
  while (files.hasNext()) {
    const file = files.next()
    fileIdList.push(file.getId())
  }

  const folders = targetFolder.getFolders()
  while (folders.hasNext()) {
    const folder = folders.next()
    fileIdList = fileIdList.concat(getAllFileIdByType(folder, fileType))
  }

  return fileIdList
}

const postSlackMessage = (message: string): void => {
  const url = "https://slack.com/api/chat.postMessage"
  const data = {
    channel: SLACK_FORM_CHANNEL,
    text: message
  }
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`
    },
    payload: JSON.stringify(data)
  });

  const responseCode = res.getResponseCode()
  if (responseCode !== 200) {
    Logger.log(res.getContentText())
    Logger.log(`responseCode: ${responseCode}`)
  }
}