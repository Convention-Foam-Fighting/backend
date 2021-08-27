exports.up = knex =>
  knex.schema
    .createTable('checkin', table => {
      table.increments('checkin_id').primary();
      table.integer('waiver_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

exports.down = knex =>
  knex.schema
    .dropTable('checkin');
