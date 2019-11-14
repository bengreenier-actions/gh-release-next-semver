const semver = require('semver')
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
   * Should we bump the major version
   */
  type: core.getInput('type', { required: true })
})

/**
 * The work our action does, wrapped in an async function
 */
const asyncWork = async () => {
  const config = getConfig()
  const api = new GitHub(config.token)

  // enumerate releases
  const releases = await api.repos.listReleases(context.repo)
  const releaseData = releases.data

  const normalizeToVersion = name => {
    const v = config.strip_tag_prefix ? name.substr(config.strip_tag_prefix.length) : name

    return semver.parse(v)
  }

  const top = releaseData
    .map(a => normalizeToVersion(config.use_tag_name ? a.tag_name : a.name))
    .sort((a, b) => {
      return a.compare(b)
    })[0]

  if (!top) {
    top = semver.parse('0.0.0')
  }

  return top.inc(conf.type).raw
}

// do the work for the action
asyncWork().then(
  output => {
    // inform the actions runner of our output
    core.setOutput('next', output)
  },
  err => {
    // inform the actions runner of our failure
    core.setFailed(err.message)
  }
)
