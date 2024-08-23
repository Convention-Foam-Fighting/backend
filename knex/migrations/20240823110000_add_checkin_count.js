exports.up = knex =>
  knex.schema.table('checkin', table =>
    table.string('count').defaultTo(1)
  );

exports.down = knex =>
  knex.schema.table('checkin', table =>
    table.dropColumn('count')
  );
