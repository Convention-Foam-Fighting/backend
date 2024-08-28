exports.up = knex =>
  knex.schema.table('checkin', table =>
    table.string('timezone').nullable()
  );

exports.down = knex =>
  knex.schema.table('checkin', table =>
    table.dropColumn('timezone')
  );