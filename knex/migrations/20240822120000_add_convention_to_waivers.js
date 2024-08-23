exports.up = knex =>
  knex.schema.table('waivers', table =>
    table.string('convention').defaultTo(null)
  );

exports.down = knex =>
  knex.schema.table('waivers', table =>
    table.dropColumn('convention')
  );
