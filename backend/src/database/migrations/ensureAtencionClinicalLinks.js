import { DataTypes } from "sequelize";

const addColumnIfMissing = async (queryInterface, table, column, definition) => {
  const description = await queryInterface.describeTable(table);
  if (!description[column]) await queryInterface.addColumn(table, column, definition);
};

export const ensureAtencionClinicalLinks = async (queryInterface) => {
  await addColumnIfMissing(queryInterface, "historia_diagnosticos", "pieza", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "planes_tratamiento", "diagnostico_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "historia_diagnosticos", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "planes_tratamiento", "fecha_prevista", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "planes_tratamiento", "atencion_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "atenciones", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "procedimientos_realizados", "plan_tratamiento_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "planes_tratamiento", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "atenciones", "proxima_cita_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "citas", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "citas", "atencion_origen_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "atenciones", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "periodontograma_mediciones", "atencion_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "atenciones", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  const tables = await queryInterface.showAllTables();
  if (!tables.includes("odontograma_cambios")) {
    await queryInterface.createTable("odontograma_cambios", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      paciente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "pacientes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      atencion_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "atenciones", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      odontologo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "odontologos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      pieza: { type: DataTypes.STRING, allowNull: false },
      estado_anterior: { type: DataTypes.STRING, allowNull: true },
      notas_anteriores: { type: DataTypes.TEXT, allowNull: true },
      estado_nuevo: { type: DataTypes.STRING, allowNull: false },
      notas_nuevas: { type: DataTypes.TEXT, allowNull: true },
      creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  }
  if (!tables.includes("atenciones_diagnosticos")) {
    await queryInterface.createTable("atenciones_diagnosticos", {
      atencion_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "atenciones", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      diagnostico_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "historia_diagnosticos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });
  }
  if (!tables.includes("historia_diagnostico_cambios")) {
    await queryInterface.createTable("historia_diagnostico_cambios", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      paciente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "pacientes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      diagnostico_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "historia_diagnosticos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      odontologo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "odontologos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      estado_anterior: { type: DataTypes.STRING, allowNull: false },
      estado_nuevo: { type: DataTypes.STRING, allowNull: false },
      creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  }

  const indexes = await queryInterface.showIndex("atenciones_diagnosticos");
  if (!indexes.some((index) => index.unique && (index.fields || []).length === 2)) {
    await queryInterface.addIndex("atenciones_diagnosticos", ["atencion_id", "diagnostico_id"], {
      unique: true,
      name: "atenciones_diagnosticos_atencion_diagnostico_uq",
    });
  }

  for (const [table, column, name] of [
    ["atenciones", "proxima_cita_id", "atenciones_proxima_cita_uq"],
    ["citas", "atencion_origen_id", "citas_atencion_origen_uq"],
    ["periodontograma_mediciones", "atencion_id", "periodontograma_mediciones_atencion_idx"],
    ["odontograma_cambios", "atencion_id", "odontograma_cambios_atencion_idx"],
    ["odontograma_cambios", "paciente_id", "odontograma_cambios_paciente_idx"],
  ]) {
    const tableIndexes = await queryInterface.showIndex(table);
    const unique = name.endsWith("_uq");
    if (!tableIndexes.some((index) => index.unique === unique && (index.fields || []).some((field) =>
      (typeof field === "string" ? field : field.attribute || field.name || field.field) === column,
    ))) {
      await queryInterface.addIndex(table, [column], { unique, name });
    }
  }
};
