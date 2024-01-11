const fs = require('fs-extra')
const inquirer = require('inquirer')

const settingsFilePath = 'settings.json'

function readSettings() {
  try {
    return JSON.parse(fs.readdirSync(settingsFilePath, 'utf-8')) || {}
  } catch (error) {
    return {}
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8')
}

async function configureSettings() {
  const currentSettings = readSettings()
  const languageChoices = ['lua', 'js', 'ts', 'c', 'cpp', 'c#', 'Java (Maven)', 'Java (Gradle)', 'Java (Native)'];

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'language',
      message: 'Select Language you want to organize',
      choices: ['lua', 'js', 'ts', 'c', 'cpp', 'c#', 'Java (Maven)', 'Java (Gradle)', 'Java (Native)'],
    }
  ])

  const languagePaths = {};

  for (const language of languageChoices) {
    if (answers.language.includes(language)) {
      const defaultKey = language.toLowerCase();
      const keyMapping = {
        'Java (Gradle)': 'javag',
        'Java (Maven)': 'javam',
        'Java (Native)': 'java',
        'c#': 'cs',
      }

      const key = keyMapping[language] || defaultKey

      const { path } = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: `Enter path for ${language}:`,
          validate: function (input) {
            return fs.existsSync(input) || 'Path does not exist. Please enter a valid path.';
          }
        }
      ])

      languagePaths[key] = path
    }
  }

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Do you confirm?'
    }
  ])

  if (!confirmed) {
    return;
  }

  const updatedSettings = { ...currentSettings, ...answers, path: languagePaths }
  writeSettings(updatedSettings)

  console.log('Settings saved successfully.')
}

configureSettings()
