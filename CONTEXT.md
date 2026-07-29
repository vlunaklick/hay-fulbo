# Hay Fulbo

Hay Fulbo organiza partidos informales entre personas que pueden reunirse en distintos grupos privados.

## Language

**Grupo**:
Espacio privado que reúne sus propios jugadores, partidos, pagos y estadísticas. Una misma persona puede participar en más de un grupo.
_Avoid_: Liga, club, comunidad

**Jugador**:
Persona que participa en partidos y acumula estadísticas dentro de un grupo. Puede existir sin tener acceso a la aplicación.
_Avoid_: Usuario, cuenta

**Usuario**:
Identidad con acceso a la aplicación que puede vincularse a uno o más jugadores. No toda persona registrada como jugador necesita ser usuario.
_Avoid_: Jugador, perfil

**Organizador**:
Usuario responsable de crear un partido, definir sus datos, designar capitanes, corregir cualquier carga y cerrarlo como autoridad final.
_Avoid_: Administrador, dueño

**Capitán**:
Usuario designado para armar uno de los equipos y cargar la participación, los pagos y las estadísticas de sus jugadores. Sus cargas permanecen bajo la autoridad del organizador.
_Avoid_: Organizador, entrenador

**Aporte**:
Importe esperado y efectivamente pagado por un jugador para un partido. El esperado surge del prorrateo del costo entre participantes, admite ajustes, y su estado —pendiente, parcial o pagado— se deriva de ambos importes.
_Avoid_: Checkbox de pago, cuota

**Actuación**:
Participación de un jugador en un partido, con sus totales de goles y asistencias. No representa una cronología de jugadas.
_Avoid_: Evento, jugada

**Equipo de partido**:
Agrupación temporal de jugadores que existe solo dentro de un partido. No conserva un plantel ni identidad entre fechas.
_Avoid_: Club, plantel, equipo permanente

**Vista compartida**:
Acceso privado de solo lectura a toda la información de un grupo mediante un enlace. Permite consultar sin que el visitante necesite una cuenta.
_Avoid_: Cuenta de invitado, acceso público

**Partido**:
Encuentro programado dentro de un grupo con dos equipos temporales, una cancha, un costo y actuaciones. Solo al cerrarse consolida resultados y estadísticas globales.
_Avoid_: Fecha, evento

**Partido cerrado**:
Partido validado por el organizador cuyos datos ya cuentan para resultados y estadísticas.
_Avoid_: Partido terminado, borrador

**Cancha**:
Lugar reutilizable de un grupo donde se disputan partidos, identificado por nombre, dirección y enlace de ubicación.
_Avoid_: Locación, sede
