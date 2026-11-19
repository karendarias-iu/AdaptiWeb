-- Migración para bases de datos que YA tienen la tabla Preferencias creada.
-- (Si creas la base desde cero, basta con ejecutar schema.sql, que ya incluye estos cambios.)
USE adaptiweb;

-- PASO 1. Limpia filas duplicadas por usuario (si guardaste varias veces antes de tener el índice único).
-- Conserva solo la fila más reciente de cada usuario.
DELETE p1 FROM Preferencias p1
JOIN Preferencias p2
  ON p1.id_usuario = p2.id_usuario AND p1.id_preferencia < p2.id_preferencia;

-- Si hay filas de prueba con textos en espacio_letras / espacio_palabras, bórralas antes del PASO 2:
-- DELETE FROM Preferencias;

-- PASO 2. Ajusta tipos y agrega el índice único (1 fila por usuario).
ALTER TABLE Preferencias
  MODIFY espacio_letras   DECIMAL(10,2),
  MODIFY espacio_palabras DECIMAL(10,2),
  ADD CONSTRAINT uq_preferencias_usuario UNIQUE (id_usuario);
