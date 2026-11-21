-- Migración de la tabla Marcadores para guardar enlaces favoritos.
-- Ejecutar UNA sola vez sobre la base de datos de AdaptiWeb (el backend también lo aplica solo al primer uso).

USE adaptiweb;

ALTER TABLE Marcadores
  ADD COLUMN favorito TINYINT(1) NOT NULL DEFAULT 0 AFTER url,
  MODIFY titulo VARCHAR(150) NOT NULL,
  MODIFY url VARCHAR(2048) NOT NULL;
