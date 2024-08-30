exports.up = knex =>
  knex.schema.table('waivers', table =>
    table.string('timezone').nullable()
  );

exports.down = knex =>
  knex.schema.table('waivers', table =>
    table.dropColumn('timezone')
  );