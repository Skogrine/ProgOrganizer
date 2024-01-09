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

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'language',
      message: 'Select Language you want to organize',
      choices: ['Lua', 'JS/TS', 'Java'],
    }
  ])

  const updatedSettings = { ...currentSettings, ...answers }
  writeSettings(updatedSettings)

  console.log('Settings saved successfully.')
  console.log('Updated Settings:', updatedSettings)
}

configureSettings()
