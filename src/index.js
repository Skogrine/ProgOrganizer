const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const clear = require('clear');
const Logger = require('@ptkdev/logger');
const { config } = require('./config/config');
const commander = require('commander');
const { getProjectInfo } = require('./utils/utils');

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
const ignoredFoldersCache = new Set();

async function isIgnored(fullPath) {
  try {

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
      if (!ignoredFoldersCache.has(fullPath)) {
        logger.warning(
          `Ignoring folder: ${fullPath} (folder or parent contains .iml)`
        );
        ignoredFoldersCache.add(fullPath);
      }
      return true;
    }

    if (ignoredFolders.includes(path.basename(fullPath))) {
      if (!ignoredFoldersCache.has(fullPath)) {
        logger.warning(`Ignoring folder: ${fullPath}`);
        ignoredFoldersCache.add(fullPath);
      }
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

async function registerProjectIfExist(folderPath) {
  logger.info('Starting detecting project in ' + folderPath);

  const checkAndRegister = async (filePath, type, parseFunction) => {
    if (fs.existsSync(filePath)) {
      const fileContent = await readFileContent(filePath);

      if (fileContent) {
        const { projectName, version } = parseFunction(fileContent);

        logger.debug(`Project found in ${folderPath} - ${type} - ${filePath}`);

        projectObject.push({
          type,
          path: folderPath,
          projectName,
          version,
        });

        return true;
      }
    }
    return false;
  };

  const checks = [
    checkAndRegister(path.join(folderPath, 'pom.xml'), ProjectType.JAVA_MAVEN, parseMavenFile),
    checkAndRegister(path.join(folderPath, 'build.gradle'), ProjectType.JAVA_GRADLE, parseGradleFile),
    checkAndRegister(path.join(folderPath, 'package.json'), ProjectType.JS, parsePackageJsonFile),
  ];

  return (await Promise.all(checks)).some(Boolean);
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
 * Recursively detects projects in a given root path.
 * @param {string} rootPath - The root path to scan.
 * @param {OptionsObject} options
 */
async function detectProjects(rootPath) {
  let project = projectObject[0];

  try {
    const files = await fs.readdir(rootPath);
    for (const file of files) {

      const fullPath = path.join(rootPath, file);

      if (await isIgnored(fullPath)) {
        continue;
      }

      project = projectObject[projectObject.length - 1];

      const isDirectory = (await fs.stat(fullPath)).isDirectory();
      if (isDirectory) {
        if (await registerProjectIfExist(fullPath)) {
          continue;
        }
        await detectProjects(fullPath);
      }
    }
  } catch (error) {
    logger.error(`${error.message}`, 'Error detecting projects');
  }
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


const args = process.argv.slice(2);
const pathIndex = Math.max(args.indexOf('--path'), args.indexOf('-p'));
const rootPath =
  pathIndex !== -1 ? path.resolve(args[pathIndex + 1]) : undefined;

detectProjects(rootPath || process.cwd());
