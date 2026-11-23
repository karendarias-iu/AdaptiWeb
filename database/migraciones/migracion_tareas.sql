-- Migración de la tabla Tareas para la lista de tareas con recordatorios.
-- Ejecutar UNA sola vez sobre la base de datos de AdaptiWeb (si una columna ya existe, MySQL avisará y no la duplica).
-- La tabla conserva sus columnas originales: titulo, descripcion, fecha_tarea (fecha/hora de finalización),
-- estado ('Sin Terminar' | 'Terminada') y fecha_creacion.

USE adaptiweb;

ALTER TABLE Tareas
  ADD COLUMN recordatorio DATETIME NULL AFTER fecha_tarea,
  ADD COLUMN recordatorio_notificado TINYINT(1) NOT NULL DEFAULT 0 AFTER recordatorio;
