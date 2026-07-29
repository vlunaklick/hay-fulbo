# Hay Fulbo

Hay Fulbo organiza partidos informales entre personas que pueden reunirse en distintos grupos privados.

## Language

**Grupo**:
Espacio privado que reúne sus propios jugadores, partidos, pagos y estadísticas. Una misma persona puede participar en más de un grupo.
_Avoid_: Liga, club, comunidad

**Grupo archivado**:
Grupo conservado como historial, pero fuera de la operación cotidiana y sin nuevos partidos.
_Avoid_: Grupo eliminado, grupo cerrado

**Jugador**:
Persona que participa en partidos y acumula estadísticas dentro de un grupo. Puede existir sin acceso a la aplicación y archivarse sin perder su historia.
_Avoid_: Usuario, cuenta

**Usuario**:
Identidad con acceso a la aplicación que puede vincularse a uno o más jugadores. No toda persona registrada como jugador necesita ser usuario.
_Avoid_: Jugador, perfil

**Organizador**:
Usuario responsable de crear un partido, definir sus datos, designar capitanes, corregir cualquier carga y cerrarlo como autoridad final.
_Avoid_: Administrador, dueño

**Responsable del grupo**:
Usuario que controla la membresía y las invitaciones de un grupo. Esta autoridad no lo convierte automáticamente en organizador de todos sus partidos.
_Avoid_: Organizador, administrador global

**Capitán**:
Usuario designado para armar uno de los equipos y cargar la participación, los pagos y las estadísticas de sus jugadores. Sus cargas permanecen bajo la autoridad del organizador.
_Avoid_: Organizador, entrenador

**Aporte**:
Importe esperado y efectivamente pagado por un jugador para un partido. El esperado surge del prorrateo exacto del costo entre participantes, admite ajustes y queda congelado al cerrar el partido.
_Avoid_: Checkbox de pago, cuota

**Estado del aporte**:
Situación derivada de comparar el importe esperado con el pagado: exento, pendiente, parcial, pagado o excedido. Un aporte puede actualizarse después del cierre sin alterar el resultado deportivo.
_Avoid_: Estado de pago manual, saldo entre partidos

**Actuación**:
Participación de un jugador en un partido, con sus totales de goles y asistencias. No representa una cronología de jugadas.
_Avoid_: Evento, jugada

**Gol atribuido**:
Gol que acredita a un jugador participante y aporta al marcador de su equipo.
_Avoid_: Gol normal, gol de jugador

**Gol sin autor**:
Gol que aporta al marcador de un equipo sin acreditar a un jugador.
_Avoid_: Gol anónimo, gol faltante

**Autogol**:
Gol atribuido por separado al jugador que lo hizo, que aporta al marcador rival sin sumarse a sus goles ni a su G+A.
_Avoid_: Gol atribuido, gol a favor

**Marcador**:
Total de goles de los dos equipos en un partido, compuesto por goles atribuidos, goles sin autor y autogoles rivales.
_Avoid_: Resultado manual, tanteador independiente

**Equipo de partido**:
Agrupación temporal de jugadores que existe solo dentro de un partido. No conserva un plantel ni identidad entre fechas.
_Avoid_: Club, plantel, equipo permanente

**Vista compartida**:
Acceso privado de solo lectura a toda la información de un grupo mediante un enlace. Permite consultar sin que el visitante necesite una cuenta.
_Avoid_: Cuenta de invitado, acceso público

**Partido**:
Encuentro programado dentro de un grupo con dos equipos temporales, una cancha, un costo y actuaciones. Puede estar abierto, cerrado o cancelado.
_Avoid_: Fecha, evento

**Partido abierto**:
Partido editable que todavía no aporta resultados ni estadísticas globales.
_Avoid_: Borrador, partido activo

**Partido cerrado**:
Partido validado por el organizador cuyos datos deportivos y aportes esperados quedaron congelados y ya cuentan para resultados y estadísticas.
_Avoid_: Partido terminado, borrador

**Partido cancelado**:
Partido que no se disputará y no aporta resultados, estadísticas ni deuda. Conserva su lugar en el historial del grupo.
_Avoid_: Partido eliminado, partido cerrado

**Cancha**:
Lugar reutilizable de un grupo donde se disputan partidos, identificado por nombre, dirección y enlace de ubicación. Puede archivarse para dejar de seleccionarla sin borrar partidos anteriores.
_Avoid_: Locación, sede
