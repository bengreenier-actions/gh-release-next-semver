const semver = require('semver')
const conventionalRecommendedBump = require('conventional-recommended-bump')
const angularConvention = require('conventional-changelog-angular')
const core = require('@actions/core')
const { GitHub, context } = require('@actions/github')

/**
 * Get configuration from the platform runtime
 */
const getConfig = () => ({
  /**
   * Github auth token
   */
  token: core.getInput('token', { required: true }),

  /**
   * Should we use the tag name instead of the release name
   */
  use_tag_name: core.getInput('use_tag_name', { required: true }),

  /**
   * A prefix we should strip away
   */
  strip_tag_prefix: core.getInput('strip_tag_prefix'),

  /**
   * GitHub repo context to use instead of the current one (username/reponame)
   */
  override_repo: core.getInput('override_repo'),

  /**
   * What semver bump type is this (auto, major, premajor, minor, preminor, patch, prepatch, or prerelease)
   *
   * Note: When type is 'auto', conventionalRecommendedBump is used.
   */
  type: core.getInput('type', { required: true })
})

/**
 * The work our action does, wrapped in an async function
 */
const asyncWork = async () => {
  const config = getConfig()

  // this is hardcoded from the semver docs (+ auto). As such, we'll only warn on it - not error
  const supportedTypes = ['auto', 'major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease']

  if (!supportedTypes.includes(config.type)) {
    core.warning(`Warning: Unknown type '${config.type}' given. Semver will probably fail.`)
  }

  const api = new GitHub(config.token)

  // enumerate command context
  let enumerateContext = context.repo

  // if the user overrides it, let it be known
  if (config.override_repo) {
    const [owner, repo] = config.override_repo.split('/')
    enumerateContext = {
      owner,
      repo
    }

    console.log(`Overriding repo to '${owner}/${repo}'.`)
  }

  console.log(`Using repo '${enumerateContext.owner}/${enumerateContext.repo}'.`)

  // use the enumerate context to do the enumeration
  // we use paginate to get _all_ results
  const releases = await api.paginate('GET /repos/:owner/:repo/releases', enumerateContext)

  const normalizeToVersion = name => {
    // TODO(bengreenier): this is weird - probably use regex or match the actual literal (not length)
    const v = config.strip_tag_prefix ? name.substr(config.strip_tag_prefix.length) : name

    return semver.parse(v)
  }

  let top = releases
    .map(a => normalizeToVersion(config.use_tag_name ? a.tag_name : a.name))
    .filter(r => r !== null)
    .sort((a, b) => {
      return b.compare(a)
    })[0]

  if (!top) {
    core.warning("No Releases found - Starting at version '0.0.0'.")

    top = semver.parse('0.0.0')
  } else {
    console.log(`Found latest release - version '${top.raw}'.`)
  }

  if (config.type === 'auto') {
    console.log(`Found type 'auto' - Reading conventional-commits...`)
    config.type = await new Promise((resolve, reject) => {
      conventionalRecommendedBump({ config: angularConvention }, (err, recomendation) => {
        if (err) reject(err)
        else resolve(recommendation.releaseType)
      })
    })

    console.log(`Using type: '${config.type}'.`)
  }

  return top.inc(config.type).raw
}

// do the work for the action
asyncWork().then(
  output => {
    // inform the actions runner of our output
    core.setOutput('next', output)
  },
  err => {
    // inform the actions runner of our failure
    core.setFailed(`${err.message}\n${err.stack}`)
  }
)
