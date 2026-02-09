exports.up = (knex) =>
  knex.schema.alterTable('events', (table) => {
    table.string('timezone').nullable().alter();
  });

exports.down = (knex) =>
  knex.schema.alterTable('events', (table) => {
    table.string('timezone').notNullable().alter();
  });
