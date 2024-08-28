exports.up = (knex) =>
  knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.dateTime('start_date').notNullable();
    table.dateTime('end_date').notNullable();
    table.string('timezone').notNullable();
    table.string('logo_url');
    table.timestamps(true, true);
  });

exports.down = (knex) =>
  knex.schema.dropTable('events');