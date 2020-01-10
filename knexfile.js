const camelCaseKeys = require('camelcase-keys');
const { snakeCase } = require('snake-case');

module.exports = {
  client: 'sqlite3',
  connection: {
    filename: './cff.db',
  },
  migrations: {
    directory: './knex/migrations',
    tableName: 'knex_migrations',
  },
  postProcessResponse(result) {
    if (Array.isArray(result)) {
      if (typeof result[0] === 'number') {
        return {result};
      }
      return camelCaseKeys(result);
    } else if (typeof result === 'number') {
      return {result};
    }
    return camelCaseKeys(result);
  },
  wrapIdentifier(value, origImp) {
    return origImp(snakeCase(value))
  },
  useNullAsDefault: true
};
