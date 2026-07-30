# Better Auth para grupos, invitaciones y roles

Investigación para Hay Fulbo sobre Better Auth `1.6.25`. Se tomó como fuente normativa la etiqueta oficial [`v1.6.25`](https://github.com/better-auth/better-auth/tree/v1.6.25) y como estado local el commit [`2193485`](https://github.com/vlunaklick/hay-fulbo/tree/2193485e7daa80889c5277fa80a99a85f588380d).

## Respuesta

Conviene usar el plugin **Organization** como infraestructura de acceso al **Grupo**, pero no como modelo completo del dominio:

- Un `organization` representa un Grupo y `member` representa a un Usuario con acceso autenticado a ese Grupo. Better Auth lista todas las organizaciones de un usuario y mantiene una organización activa, por lo que soporta naturalmente que una cuenta acceda a varios grupos ([documentación `v1.6.25`](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L529-L618)).
- Las invitaciones oficiales cubren el alta por email de Usuarios con un rol en un Grupo: la aplicación construye y envía el enlace, y la aceptación exige una sesión iniciada cuyo email coincida con la invitación ([documentación `v1.6.25`](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L835-L930); [validación en el código `v1.6.25`](https://github.com/better-auth/better-auth/blob/v1.6.25/packages/better-auth/src/plugins/organization/routes/crud-invites.ts#L621-L698)).
- Better Auth trae roles `owner`, `admin` y `member`, admite múltiples roles y permite definir roles y permisos propios estáticos. También ofrece roles dinámicos por organización, pero estos agregan la tabla `organizationRole` y no hacen falta para un conjunto fijo de permisos ([roles y permisos personalizados](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L1200-L1364); [control dinámico](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L1447-L1497)).
- Better Auth no cubre Jugadores sin cuenta ni una Vista compartida anónima. Ambos requieren modelos y autorización propios.

## Límite entre autenticación y dominio

### Grupo y membresía autenticada

Usar directamente `organization.id` como `groupId` en las tablas del dominio evita duplicar Grupo y Organization. El plugin agrega `organization`, `member`, `invitation` y `session.activeOrganizationId`; debe generarse y migrarse ese esquema antes de activar el plugin ([esquema oficial](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L2086-L2261)).

`member` no es el plantel del grupo. Su `userId` es obligatorio y referencia a `user`, por lo que solo representa personas con cuenta ([fuente `v1.6.25`](https://github.com/better-auth/better-auth/blob/v1.6.25/packages/better-auth/src/plugins/organization/schema.ts#L126-L152)). Debe existir un modelo propio:

```text
Player
  id
  groupId -> organization.id
  userId -> user.id | null
  name
  active
```

Así un Jugador existe y acumula estadísticas sin login; vincularlo a un Usuario es opcional y posterior. La membresía de Better Auth decide si ese Usuario puede entrar al Grupo, mientras `Player.userId` solo enlaza identidad y estadísticas. Esto conserva la separación ya fijada entre Jugador y Usuario en el [lenguaje local](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/CONTEXT.md#L11-L17).

### Organizador y Capitán

Los roles de Organization son por membresía del Grupo, no por Partido. Por eso un rol Better Auth llamado `captain` daría permiso sobre todo el Grupo y perdería qué equipo y qué partido originaron esa autoridad. Tampoco conviene usar Teams: son agrupaciones persistentes de Usuarios dentro de una organización, agregan `team`/`teamMember`, y `teamMember.userId` es obligatorio; los equipos de Hay Fulbo son temporales y contienen Jugadores que pueden no tener cuenta ([Teams y su esquema](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L1741-L1779); [membresía de Team](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L2343-L2374)).

La autoridad debe ser de dominio y quedar registrada en el partido:

```text
Match.organizerUserId -> user.id
MatchTeam.captainUserId -> user.id
```

Cada mutación debe verificar simultáneamente:

1. que el Usuario sea `member` del Grupo;
2. que sea el Organizador del Partido, o el Capitán del equipo afectado;
3. que el Partido no esté cerrado;
4. que el Capitán solo cambie su propio equipo y que el Organizador pueda corregir y cerrar.

Los permisos personalizados de Better Auth pueden servir como una primera barrera para acciones de nivel Grupo —por ejemplo, invitar miembros—, pero no reemplazan estas comprobaciones por recurso. La definición local asigna Organizador y Capitán a responsabilidades de un partido concreto ([lenguaje local](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/CONTEXT.md#L19-L25)).

### Vista compartida

Los endpoints de Organization que leen miembros u organizaciones requieren sesión ([lista de miembros](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L1049-L1092); [lista de organizaciones](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L601-L608)). El plugin One-Time Token tampoco modela una vista compartida: genera un token asociado a una sesión existente, de un solo uso y con vencimiento predeterminado de tres minutos, y al verificarlo devuelve esa sesión ([documentación `v1.6.25`](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/one-time-token.mdx#L1-L84)).

La Vista compartida necesita un credential propio, revocable y estrictamente de lectura:

```text
GroupShareLink
  id
  groupId -> organization.id
  tokenHash (unique)
  createdAt
  revokedAt | null
```

La aplicación genera un secreto aleatorio de alta entropía, muestra el valor crudo solo en el enlace y guarda únicamente su hash. Una ruta/procedure separada resuelve el hash, fija el `groupId` en contexto y expone solo queries. No debe crear una sesión Better Auth, aceptar mutaciones ni confiar en un `groupId` adicional enviado por el visitante. Rotar el enlace crea un secreto nuevo y revoca el anterior.

## Cambios necesarios en la integración actual

El repositorio ya fija Better Auth y Expo en `1.6.25` ([catálogo local](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/package.json#L9-L27)), pero todavía no tiene Organizations operativo:

1. **Servidor:** `createAuth` solo activa `nextCookies()` y `expo()`; falta `organization(...)` ([configuración local](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/auth/src/index.ts#L9-L25)).
2. **Clientes:** ni web ni native registran `organizationClient(...)`, por lo que no exponen la API tipada del plugin ([web](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/apps/web/src/lib/auth-client.ts#L1-L3); [native](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/apps/native/lib/auth-client.ts#L1-L16)).
3. **Base de datos:** el adaptador recibe exclusivamente `@hay-fulbo/db/schema/auth`, que hoy contiene solo `user`, `session`, `account` y `verification`; faltan todas las tablas del plugin y `session.activeOrganizationId` ([adaptador](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/auth/src/index.ts#L12-L17); [schema actual](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/db/src/schema/auth.ts#L4-L74)). Better Auth exige agregar el plugin, generar el esquema y migrarlo, además de registrar el plugin cliente ([instalación oficial](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L8-L61)).
4. **Email:** `emailAndPassword` está habilitado sin verificación y no existe callback de email de invitación. Better Auth no envía la invitación por sí mismo: la aplicación debe implementar `sendInvitationEmail` y construir la URL ([invitaciones](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L839-L865)). Si se considera sensible la pertenencia al Grupo, conviene implementar `emailVerification.sendVerificationEmail`, `emailAndPassword.requireEmailVerification: true` y `requireEmailVerificationOnInvitation: true`; Better Auth documenta tanto la configuración de verificación como el endurecimiento específico de invitaciones ([verificación de email](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/authentication/email-password.mdx#L128-L180); [invitaciones verificadas](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L926-L944)).
5. **Autorización tRPC:** `protectedProcedure` solo comprueba que exista una sesión; no prueba membresía, Grupo, Organizador, Capitán ni estado del Partido ([middleware actual](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/api/src/index.ts#L9-L24)). Deben agregarse guards/procedures de Grupo y Partido antes de implementar mutaciones.

## Riesgos concretos y mitigaciones

| Riesgo                                                     | Consecuencia                                                                                         | Mitigación                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activar `organization()` sin schema y migración            | Errores de runtime al consultar tablas o columnas inexistentes                                       | Generar el schema Drizzle para la configuración final, revisar la migración y aplicarla antes del deploy                                                                                                                                  |
| Mantener solo `protectedProcedure`                         | Cualquier usuario autenticado podría operar sobre IDs de otros grupos si un handler olvida el filtro | Contexto con membresía resuelta y guards obligatorios por Grupo/Partido                                                                                                                                                                   |
| Modelar Jugador como `member`                              | Obliga a crear cuentas falsas y mezcla acceso con estadísticas                                       | `Player` propio con `userId` nullable                                                                                                                                                                                                     |
| Modelar Capitán con un rol del Grupo                       | Otorga autoridad transversal y rompe la historia cuando cambian los capitanes                        | FK por Partido/equipo y autorización por recurso                                                                                                                                                                                          |
| Habilitar Teams para equipos de partido                    | Crea equipos persistentes y solo acepta Usuarios                                                     | Mantener equipos y actuaciones en el dominio                                                                                                                                                                                              |
| Usar invitaciones sin entrega/verificación definida        | Flujo incompleto y mayor impacto si se filtra un ID de invitación                                    | Servicio de email, URL propia, IDs opacos y verificación obligatoria                                                                                                                                                                      |
| Dejar la creación de organizaciones con defaults           | Better Auth permite crear organizaciones a cualquier Usuario por defecto                             | Configurar `allowUserToCreateOrganization` según la regla del producto ([opción oficial](https://github.com/better-auth/better-auth/blob/v1.6.25/packages/better-auth/src/plugins/organization/types.ts#L20-L34))                         |
| Exponer `organization.delete` al mapear Grupo directamente | Better Auth elimina organización, miembros e invitaciones sin conocer Partidos, Jugadores y pagos    | Desactivar la eliminación del plugin en el MVP o centralizarla en una operación de dominio transaccional ([opción oficial](https://github.com/better-auth/better-auth/blob/v1.6.25/docs/content/docs/plugins/organization.mdx#L794-L833)) |
| Reutilizar sesión u OTT para la Vista compartida           | El visitante obtiene semántica de Usuario o un token efímero, no acceso de lectura revocable         | Token propio hasheado y procedure de solo lectura                                                                                                                                                                                         |

## Decisión recomendada

Adoptar **Organization sin Teams ni Dynamic Access Control**:

- `organization` = Grupo;
- `member`/`invitation` = acceso de Usuarios al Grupo;
- roles estáticos solo para administración de nivel Grupo si llegan a ser necesarios;
- `Player.userId nullable` = vínculo opcional Usuario–Jugador;
- Organizador y Capitán = asignaciones propias por Partido/equipo;
- Vista compartida = token propio hasheado y revocable, con API exclusivamente de lectura;
- schema generado/migrado, plugin instalado en servidor y clientes, email de invitación/verificación configurado y autorización tRPC por recurso.

Esta separación usa Better Auth para lo que garantiza oficialmente —identidad, sesión, membresía, invitaciones y permisos de organización— y conserva en Hay Fulbo las reglas temporales y los actores sin cuenta que Better Auth no representa.
