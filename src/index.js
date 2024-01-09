const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const clear = require('clear')
const Logger = require('@ptkdev/logger')
const { config } = require('./config/config')
const commander = require('commander')

const logger = new Logger(config.loggerOptions)

/**
 * Represents a project with its type and path.
 * @typedef {Object} ProjectObject
 * @property {string} project - The type of the project.
 * @property {string} path - The path to the project.
 * @property {string} projectName - The name of the project.
 * @property {string} version - The version of the project.
 */

/** @type {*} */
const projectObject = [{}]

/**
 * Checks if a folder is ignored based on certain criteria.
 * @param {string} fullPath - The full path of the folder.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the folder is ignored, false otherwise.
 */
async function isIgnored(fullPath) {
  try {
    const files = await fs.readdir(fullPath)

    if (files.some((file) => file.endsWith('.iml'))) {
      logger.warning(
        `Ignoring folder: ${fullPath} (contains .iml or py files files)`
      )
      projectObject.push({
        path: fullPath,
        project: 'Java (Native)',
      })
      return true
    }

    const ignoredFolders = [
      '.idea',
      'node_modules',
      'build',
      '.git',
      'site-packages',
      'logs',
      'venv',
    ]

    if (fullPath.split(path.sep).some((part) => part.endsWith('.iml'))) {
      logger.warning(
        `Ignoring folder: ${fullPath} (folder or parent contains .iml)`
      )
      return true
    }

    return ignoredFolders.includes(path.basename(fullPath))
  } catch (error) {
    logger.error(
      `Error checking ignored status for folder ${fullPath}: ${error.message}`
    )
    return false
  }
}

/**
 * Reads the contents of a file.
 * @param {string} filePath - The path of the file to read.
 * @returns {Promise<string>} - A Promise that resolves to the content of the file.
 */
async function readFileContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    logger.error(`Error reading file ${filePath}: ${error.message}`)
    return null
  }
}

/**
 * Checks if a folder contains a specific type of project.
 * @param {string} folderPath - The path of the folder to check.
 * @returns {boolean} - True if the folder contains a project, false otherwise.
 */
async function isProject(folderPath) {
  const pomPath = path.join(folderPath, 'pom.xml')
  const gradlePath = path.join(folderPath, 'build.gradle')
  const packageJsonPath = path.join(folderPath, 'package.json')
  const pythonMainPath = path.join(folderPath, 'main.py')

  if (fs.existsSync(pomPath)) {
    const pomContent = await readFileContent(pomPath)
    if (pomContent) {
      const projectNameMatch = pomContent.match(
        /<artifactId>(.*?)<\/artifactId>/
      )
      const versionMatch = pomContent.match(/<version>(.*?)<\/version>/)
      const projectName = projectNameMatch
        ? projectNameMatch[1]
        : 'Unknown Project'
      const version = versionMatch ? versionMatch[1] : 'Unknown Version'

      projectObject.push({
        project: 'Java (Maven)',
        path: folderPath,
        projectName,
        version,
      })
      return true
    }
  } else if (fs.existsSync(gradlePath)) {
    const gradleContent = await readFileContent(gradlePath)
    if (gradleContent) {
      const projectNameMatch = gradleContent.match(/project\s*['"](.*?)['"]/)
      const versionMatch = gradleContent.match(/version\s*['"](.*?)['"]/)

      const projectName = projectNameMatch
        ? projectNameMatch[1]
        : 'Unknown Project'
      const version = versionMatch ? versionMatch[1] : 'Unknown Version'

      projectObject.push({
        project: 'Java (Gradle)',
        path: folderPath,
        projectName,
        version,
      })
      return true
    }
  } else if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = await readFileContent(packageJsonPath)

    if (packageJsonContent) {
      const { name, version } = JSON.parse(packageJsonContent)

      projectObject.push({
        project: 'NodeJS',
        path: folderPath,
        projectName: name || 'Unknown Project',
        version: version || 'Unknown Version',
      })
      return true
    }
  } else if (fs.existsSync(pythonMainPath)) {
    projectObject.push({ project: 'Python', path: folderPath })
    return true
  }

  return false
}

/**
 * Recursively detects projects in a given root path.
 * @param {string} rootPath - The root path to scan.
 * @param {OptionsObject} options
 */
async function detectProjects(rootPath) {
  logger.info(`Starting project detection in ${rootPath}...`, 'Search')
  let project = projectObject[projectObject.length - 1]
  try {
    const files = await fs.readdir(rootPath)

    if (await isProject(rootPath)) {
      logger.info(
        `Project (${project.project}) detected in: ${rootPath}`,
        'Find'
      )
      logger.debug(
        `Project Object: ${project.project} - ${project.projectName} / ${project.version} `
      )
      return
    }

    for (const file of files) {
      project = projectObject[projectObject.length - 1]
      const fullPath = path.join(rootPath, file)

      if ((await fs.stat(fullPath)).isDirectory()) {
        if (await isIgnored(fullPath)) {
          logger.warning(`Ignoring folder: ${fullPath}`)
          continue
        }

        if (await isProject(fullPath)) {
          logger.info(
            `Project (${project.project}) detected in: ${fullPath}`,
            'Find'
          )
          logger.debug(
            `Project Object: ${project.project} - ${project.projectName} / ${project.version}`
          )
          continue
        }

        await detectProjects(fullPath)
      }
    }
  } catch (error) {
    logger.error(`${error.message}`, 'Error detecting projects')
  }
}

const args = process.argv.slice(2)
const pathIndex = Math.max(args.indexOf('--path'), args.indexOf('-p'))
const rootPath =
  pathIndex !== -1 ? path.resolve(args[pathIndex + 1]) : undefined

detectProjects(rootPath || process.cwd())
