const fs = require('fs-extra')
const Logger = require('@ptkdev/logger')
const { config } = require('../config/config')

const logger = new Logger(config.loggerOptions)

/**
 * Enum representing different project types.
 * @readonly
 * @enum {string}
 */
const ProjectType = {
  JAVA_MAVEN: 'Java (Maven)',
  JAVA_GRADLE: 'Java (Gradle)',
  JAVA_NATIVE: 'Java (Native)',
  JS: 'JavaScript',
  TS: 'TypeScript',
  PYTHON: 'Python',
  C: 'C',
  CS: 'C#',
  CPP: 'C++',
}

/**
 * Represents a project with its type and path.
 * @typedef {Object} ProjectObject
 * @property {ProjectType} type - The type of the project.
 * @property {string} path - The path to the project.
 * @property {string} projectName - The name of the project.
 * @property {string} version - The version of the project.
 */

/** 
 * @param {ProjectObject} project 
 */
function getProjectInfo(project) {
  logger.info('-----------------------------------')
  logger.info(``)
  logger.info(`${project.projectName} Information:`)
  logger.info(`Path: ${project.path}`)
  logger.info(`Version: ${project.version}`)
  logger.info(`Type of project: ${project.type}`)
  logger.info(``)
}


module.exports = { getProjectInfo }