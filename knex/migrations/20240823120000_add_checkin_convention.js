exports.up = knex =>
  knex.schema.table('checkin', table =>
    table.string('convention').defaultTo(null)
  );

exports.down = knex =>
  knex.schema.table('checkin', table =>
    table.dropColumn('convention')
  );
