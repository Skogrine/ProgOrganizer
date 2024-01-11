const { language } = require('../settings.json')
const path = require('path')
const fs = require('fs-extra')
const Logger = require('@ptkdev/logger');
const { config } = require('./config/config');

const logger = new Logger(config.loggerOptions);

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
/** @type {ProjectObject[]} */
const projectObject = [];


/**
 * Moves the project to the specified path based on its type.
 * @param {ProjectObject} projectObject - The project object to move.
 */
function movePath(projectObject) {
  const typeToPathMap = {
    [ProjectType.JAVA_GRADLE]: path.javag,
    [ProjectType.JAVA_MAVEN]: path.javam,
    [ProjectType.JAVA_NATIVE]: path.java,
    [ProjectType.JS]: path.js,
    [ProjectType.PYTHON]: path.python,
    [ProjectType.TS]: path.ts,
    [ProjectType.C]: path.c,
    [ProjectType.CS]: path.cs,
    [ProjectType.CPP]: path.cpp,
  }

  const destinationPath = typeToPathMap[projectObject.type]

  if (destinationPath) {
    fs.moveSync(projectObject.path, destinationPath)
  }
}

async function readFileContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    logger.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * 
 * @param {string} fullPath 
 * @returns {Promise<boolean>} isIgnored
 */
async function isIgnored(fullPath) {
  try {
    const files = await fs.readdir(fullPath)

    const ignoredFolders = [
      '.idea',
      'node_modules',
      'build',
      'dist',
      '.git',
      'site-packages',
      'logs',
      'venv'
    ];

    if (fullPath.split(path.sep).some((part) => part.endsWith('.iml'))) {
      logger.warning(
        `Ignoring folder: ${fullPath} (folder or parent contains .iml)`
      );
      return true;
    }

    if (ignoredFolders.includes(path.basename(fullPath))) {
      logger.warning(`Ignoring folder: ${fullPath}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(
      `Error checking ignored status for folder ${fullPath}: ${error.message}`
    );
    return true;
  }
}

async function registerProjectIfExist(folderPath, file) {

  if (await isIgnored(folderPath)) {
    if ((await fs.stat(folderPath)).isDirectory()) {
      return;
    }
  } 

  logger.info('Starting detecting project in ' + folderPath);

  const projectObject = [];

  const checkAndRegister = async (filePath, type, parseFunction) => {
    if (fs.existsSync(filePath)) {
      const fileContent = await readFileContent(filePath);

      if (fileContent) {
        const { projectName, version } = parseFunction(fileContent);

        logger.debug(`Project found in ${folderPath} !`);

        projectObject.push({
          type,
          path: folderPath,
          projectName,
          version,
        });
      }
    }
  };

  await checkAndRegister(
    path.join(folderPath, 'pom.xml'),
    ProjectType.JAVA_MAVEN,
    parseMavenFile
  );

  await checkAndRegister(
    path.join(folderPath, 'build.gradle'),
    ProjectType.JAVA_GRADLE,
    parseGradleFile
  );

  await checkAndRegister(
    path.join(folderPath, 'package.json'),
    ProjectType.JS,
    parsePackageJsonFile
  );

  projectObject.push({
    type: ProjectType.PYTHON,
    path: folderPath,
    projectName: 'Unknown Project Name',
    version: 'Unknown Version',
  });

  return projectObject;
}

function parseMavenFile(content) {
  const projectNameMatch = content.match(/<artifactId>(.*?)<\/artifactId>/);
  const versionMatch = content.match(/<version>(.*?)<\/version>/);

  return {
    projectName: projectNameMatch ? projectNameMatch[1] : 'Unknown Project',
    version: versionMatch ? versionMatch[1] : 'Unknown Version',
  };
}

function parseGradleFile(content) {
  const projectNameMatch = content.match(/project\s*['"](.*?)['"]/);
  const versionMatch = content.match(/version\s*['"](.*?)['"]/);

  return {
    projectName: projectNameMatch ? projectNameMatch[1] : 'Unknown Project',
    version: versionMatch ? versionMatch[1] : 'Unknown Version',
  };
}

function parsePackageJsonFile(content) {
  const { name, version } = JSON.parse(content);

  return {
    projectName: name || 'Unknown Project',
    version: version || 'Unknown Version',
  };
}



module.exports = { ProjectType, movePath, registerProjectIfExist, isIgnored, projectObject }