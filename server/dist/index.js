import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import crypto from 'node:crypto';
import { pool, verifyDatabase } from './db.js';
const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ||
    'http://localhost:3000/auth/discord/callback';
const SESSION_SECRET = process.env.SESSION_SECRET;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!CLIENT_ID || !CLIENT_SECRET || !SESSION_SECRET) {
    throw new Error('Saknade DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET eller SESSION_SECRET i .env');
}
app.disable('x-powered-by');
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(session({
    name: 'dm.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));
// --------------------------------------------------
// DISCORD ROLE CONFIGURATION
// --------------------------------------------------
const roleConfig = {
    Visitor: process.env.DISCORD_ROLE_VISITOR_ID,
    Hangaround: process.env.DISCORD_ROLE_HANGAROUND_ID,
    Medlem: process.env.DISCORD_ROLE_MEDLEM_ID,
    Prospect: process.env.DISCORD_ROLE_PROSPECT_ID,
    Officer: process.env.DISCORD_ROLE_OFFICER_ID,
    'Vice President': process.env.DISCORD_ROLE_VICE_PRESIDENT_ID,
    President: process.env.DISCORD_ROLE_PRESIDENT_ID,
    Webbplatsadmin: process.env.DISCORD_ROLE_WEBSITE_ADMIN_ID,
};
// --------------------------------------------------
// ROLE PERMISSIONS
// --------------------------------------------------
const rolePermissions = {
    Visitor: ['charters.view', 'applications.view'],
    Hangaround: [
        'charters.view',
        'media.view',
        'organization.view',
    ],
    Prospect: [
        'charters.view',
        'media.view',
        'organization.view',
        'applications.view',
    ],
    Medlem: [
        'charters.view',
        'media.view',
        'organization.view',
        'members.view',
        'applications.view',
    ],
    Officer: [
        'charters.view',
        'media.view',
        'organization.view',
        'members.view',
        'applications.view',
        'members.manage',
    ],
    'Vice President': [
        'charters.view',
        'media.view',
        'organization.view',
        'members.view',
        'applications.view',
        'members.manage',
        'leadership.manage',
    ],
    President: [
        'charters.view',
        'media.view',
        'organization.view',
        'members.view',
        'applications.view',
        'members.manage',
        'leadership.manage',
        'club.full',
    ],
    Webbplatsadmin: [
        'charters.view',
        'media.view',
        'organization.view',
        'members.view',
        'applications.view',
        'website.manage',
    ],
};
const visitorPermissions = [
    'charters.view',
    'applications.view',
];
function getPermissions(roles) {
    const permissions = new Set();
    if (roles.includes('Webbplatsadmin')) {
        for (const permission of rolePermissions.Webbplatsadmin) {
            permissions.add(permission);
        }
    }
    else if (roles.includes('Visitor')) {
        for (const permission of visitorPermissions) {
            permissions.add(permission);
        }
    }
    else {
        for (const role of roles) {
            for (const permission of rolePermissions[role]) {
                permissions.add(permission);
            }
        }
    }
    return [...permissions];
}
// --------------------------------------------------
// GENERAL HELPERS
// --------------------------------------------------
function cleanText(value, maxLength = 255) {
    if (typeof value !== 'string')
        return null;
    const text = value.trim().slice(0, maxLength);
    return text || null;
}
function makeId() {
    return crypto.randomUUID();
}
function parseStringId(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }
    const id = String(value).trim();
    if (!id || id.length > 100)
        return null;
    return id;
}
function parseNullableText(value, maxLength) {
    if (value === null || value === undefined || value === '')
        return null;
    return cleanText(value, maxLength);
}
function getCharterPayload(body) {
    return {
        name: cleanText(body?.name, 180),
        shortName: cleanText(body?.short_name ?? body?.shortName, 80) || '',
        location: cleanText(body?.location, 180) || '',
        country: cleanText(body?.country, 100) || '',
        flag: cleanText(body?.flag, 20) || '',
        serverName: cleanText(body?.server_name ?? body?.serverName, 180) || '',
        status: cleanText(body?.status, 40) || 'Active',
        description: cleanText(body?.description, 5000) || '',
        image: parseNullableText(body?.image, 2000000),
        founded: cleanText(body?.founded, 80) || '',
    };
}
function formatCharter(charter) {
    return {
        ...charter,
        id: String(charter.id),
        short_name: charter.short_name ?? '',
        shortName: charter.short_name ?? '',
        server_name: charter.server_name ?? '',
        serverName: charter.server_name ?? '',
    };
}
function formatMember(member) {
    const rankName = member.rank_name ?? member.rankName ?? member.role ?? 'Full Patch';
    const charterId = member.charter_id ?? member.charterId ?? null;
    const imagePosition = member.image_position ?? member.imagePosition ?? '50% 35%';
    const joinedAt = member.joined_at ?? member.joinedAt ?? '';
    return {
        ...member,
        id: String(member.id),
        rank_name: rankName,
        rankName,
        role: rankName,
        charter_id: charterId === null ? null : String(charterId),
        charterId: charterId === null ? null : String(charterId),
        image_position: imagePosition,
        imagePosition,
        joined_at: joinedAt,
        joinedAt,
    };
}
// --------------------------------------------------
// ORGANISATION HELPERS
// --------------------------------------------------
function getOrganisationArticlePayload(body) {
    const rawDate = cleanText(body?.date, 80);
    const date = rawDate && /^\\d{4}-\\d{2}-\\d{2}$/.test(rawDate)
        ? rawDate
        : new Date().toISOString().slice(0, 10);
    return {
        title: cleanText(body?.title, 180),
        category: cleanText(body?.category, 80) || 'Archive',
        excerpt: typeof body?.excerpt === 'string'
            ? body.excerpt.trim().slice(0, 2000)
            : '',
        content: typeof body?.content === 'string'
            ? body.content.slice(0, 100000)
            : '',
        image: parseNullableText(body?.image, 2000000),
        date,
        featured: body?.featured === true || body?.featured === 1 || body?.featured === '1',
        published: body?.published === undefined
            ? true
            : body.published === true || body.published === 1 || body.published === '1',
    };
}
function formatOrganisationArticle(article) {
    return {
        ...article,
        id: String(article.id),
        featured: Boolean(article.featured),
        published: Boolean(article.published),
    };
}
function parseOrganisationArticleId(value) {
    const raw = typeof value === 'string' || typeof value === 'number'
        ? String(value).trim()
        : '';
    if (!/^\d+$/.test(raw))
        return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
// --------------------------------------------------
// DISCORD API HELPERS
// --------------------------------------------------
async function discordFetch(path) {
    if (!BOT_TOKEN) {
        throw new Error('DISCORD_BOT_TOKEN saknas i .env');
    }
    const response = await fetch(`https://discord.com/api/v10${path}`, {
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
        },
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(`Discord API misslyckades (${response.status}): ${message.slice(0, 300)}`);
    }
    return (await response.json());
}
async function getCurrentDiscordRoles(userId) {
    if (!GUILD_ID || !BOT_TOKEN) {
        throw new Error('DISCORD_GUILD_ID eller DISCORD_BOT_TOKEN saknas i .env');
    }
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
        },
        signal: AbortSignal.timeout(8000),
    });
    if (memberResponse.status === 404) {
        return { configuredRoles: [], roleDetails: [] };
    }
    if (!memberResponse.ok) {
        throw new Error(`Discord medlemskontroll misslyckades: ${memberResponse.status}`);
    }
    const member = (await memberResponse.json());
    const memberRoleIds = new Set(member.roles);
    const guildRoles = await discordFetch(`/guilds/${GUILD_ID}/roles`);
    const roleDetails = guildRoles
        .filter((role) => memberRoleIds.has(role.id))
        .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
    }))
        .sort((a, b) => b.position - a.position);
    const configuredRoles = Object.entries(roleConfig)
        .filter(([, roleId]) => Boolean(roleId) && memberRoleIds.has(roleId))
        .map(([roleName]) => roleName);
    return { configuredRoles, roleDetails };
}
// --------------------------------------------------
// AUTHENTICATED USER CONTEXT
// --------------------------------------------------
async function loadAuthContext(req) {
    const user = req.session.discordUser;
    if (!user)
        return null;
    const { configuredRoles, roleDetails } = await getCurrentDiscordRoles(user.id);
    return {
        user,
        roles: configuredRoles,
        roleDetails,
        permissions: getPermissions(configuredRoles),
        isVisitor: configuredRoles.includes('Visitor'),
    };
}
// --------------------------------------------------
// PERMISSION MIDDLEWARE
// --------------------------------------------------
function requirePermission(permission) {
    return async (req, res, next) => {
        try {
            const context = await loadAuthContext(req);
            if (!context) {
                return res.status(401).json({
                    error: 'Du måste logga in med Discord.',
                });
            }
            if (context.isVisitor &&
                !context.roles.includes('Webbplatsadmin') &&
                !visitorPermissions.includes(permission)) {
                return res.status(403).json({
                    error: 'Visitor har endast åtkomst till Charters och Ansökningar.',
                });
            }
            const hasPermission = context.permissions.includes(permission) ||
                (permission !== 'website.manage' &&
                    context.permissions.includes('club.full'));
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Du saknar behörighet för denna åtgärd.',
                });
            }
            ;
            req.authContext = context;
            return next();
        }
        catch (error) {
            console.error('Behörighetskontroll misslyckades:', error);
            return res.status(503).json({
                error: 'Kunde inte verifiera Discord-behörigheten just nu.',
            });
        }
    };
}
// Tillåter President/club.full och Webbplatsadmin/website.manage.
function requireOrganisationEditor() {
    return async (req, res, next) => {
        try {
            const context = await loadAuthContext(req);
            if (!context) {
                return res.status(401).json({
                    error: 'Du måste logga in med Discord.',
                });
            }
            const canEdit = context.permissions.includes('club.full') ||
                context.permissions.includes('website.manage');
            if (!canEdit) {
                return res.status(403).json({
                    error: 'Du saknar behörighet att redigera organisationen.',
                });
            }
            ;
            req.authContext = context;
            return next();
        }
        catch (error) {
            console.error('Organisationsbehörighet kunde inte verifieras:', error);
            return res.status(503).json({
                error: 'Kunde inte verifiera behörigheten med Discord.',
            });
        }
    };
}
// --------------------------------------------------
// CHARTER PERMISSIONS
// --------------------------------------------------
function canManageCharters(context) {
    return (context.roles.includes('President') ||
        context.roles.includes('Vice President') ||
        context.roles.includes('Officer'));
}
function requireCharterManager() {
    return async (req, res, next) => {
        try {
            const context = await loadAuthContext(req);
            if (!context) {
                return res.status(401).json({
                    error: 'Du måste logga in med Discord.',
                });
            }
            if (!canManageCharters(context)) {
                return res.status(403).json({
                    error: 'Endast President, Vice President och Officer får ändra charters.',
                });
            }
            ;
            req.authContext = context;
            return next();
        }
        catch (error) {
            console.error('Charter-behörighetskontroll misslyckades:', error);
            return res.status(503).json({
                error: 'Kunde inte verifiera Discord-behörigheten just nu.',
            });
        }
    };
}
const charterManager = requireCharterManager();
const organisationEditor = requireOrganisationEditor();
// --------------------------------------------------
// GET CHARTERS AND MEMBERS
// --------------------------------------------------
app.get('/api/charters', requirePermission('charters.view'), async (_req, res) => {
    try {
        const [charterRows] = await pool.query(`SELECT
          id, name, short_name, location, country, flag,
          server_name, status, description, image, founded
         FROM charters
         ORDER BY name ASC`);
        const [memberRows] = await pool.query(`SELECT
          id, name, rank_name, charter_id, status, image,
          image_position, joined_at, bio
         FROM charter_members
         ORDER BY name ASC`);
        return res.json({
            charters: charterRows.map(formatCharter),
            members: memberRows.map(formatMember),
        });
    }
    catch (error) {
        console.error('Kunde inte hämta charters:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa charters från databasen.',
        });
    }
});
app.get('/api/charter-members', requirePermission('charters.view'), async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT
          id, name, rank_name, charter_id, status, image,
          image_position, joined_at, bio
         FROM charter_members
         ORDER BY name ASC`);
        return res.json({ members: rows.map(formatMember) });
    }
    catch (error) {
        console.error('Kunde inte hämta charter-medlemmar:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa charter-medlemmar.',
        });
    }
});
// --------------------------------------------------
// CREATE CHARTER
// --------------------------------------------------
app.post('/api/charters', charterManager, async (req, res) => {
    const charter = getCharterPayload(req.body);
    if (!charter.name) {
        return res.status(400).json({
            error: 'Chartern måste ha ett namn.',
        });
    }
    const id = parseStringId(req.body?.id) || makeId();
    try {
        await pool.execute(`INSERT INTO charters
       (id, name, short_name, location, country, flag, server_name,
        status, description, image, founded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            charter.name,
            charter.shortName,
            charter.location,
            charter.country,
            charter.flag,
            charter.serverName,
            charter.status,
            charter.description,
            charter.image,
            charter.founded,
        ]);
        return res.status(201).json({
            ok: true,
            charter: formatCharter({
                id,
                name: charter.name,
                short_name: charter.shortName,
                location: charter.location,
                country: charter.country,
                flag: charter.flag,
                server_name: charter.serverName,
                status: charter.status,
                description: charter.description,
                image: charter.image,
                founded: charter.founded,
            }),
        });
    }
    catch (error) {
        console.error('Kunde inte skapa charter:', error);
        return res.status(400).json({
            error: 'Kunde inte spara chartern. Kontrollera uppgifterna.',
        });
    }
});
// --------------------------------------------------
// UPDATE CHARTER
// --------------------------------------------------
app.put('/api/charters/:id', charterManager, async (req, res) => {
    const id = parseStringId(req.params.id);
    const charter = getCharterPayload(req.body);
    if (!id) {
        return res.status(400).json({ error: 'Ogiltigt charter-ID.' });
    }
    if (!charter.name) {
        return res.status(400).json({
            error: 'Chartern måste ha ett namn.',
        });
    }
    try {
        const [result] = await pool.execute(`UPDATE charters
       SET name = ?, short_name = ?, location = ?, country = ?, flag = ?,
           server_name = ?, status = ?, description = ?, image = ?, founded = ?
       WHERE id = ?`, [
            charter.name,
            charter.shortName,
            charter.location,
            charter.country,
            charter.flag,
            charter.status,
            charter.description,
            charter.image,
            charter.founded,
            id,
        ]);
        if (result.affectedRows === 0) {
            const [existing] = await pool.execute('SELECT id FROM charters WHERE id = ? LIMIT 1', [id]);
            if (!existing.length) {
                return res.status(404).json({
                    error: 'Chartern hittades inte.',
                });
            }
        }
        return res.json({
            ok: true,
            charter: formatCharter({
                id,
                name: charter.name,
                short_name: charter.shortName,
                location: charter.location,
                country: charter.country,
                flag: charter.flag,
                server_name: charter.serverName,
                status: charter.status,
                description: charter.description,
                image: charter.image,
                founded: charter.founded,
            }),
        });
    }
    catch (error) {
        console.error('Kunde inte uppdatera charter:', error);
        return res.status(400).json({
            error: 'Kunde inte uppdatera chartern. Kontrollera uppgifterna.',
        });
    }
});
// --------------------------------------------------
// DELETE CHARTER
// --------------------------------------------------
app.delete('/api/charters/:id', charterManager, async (req, res) => {
    const id = parseStringId(req.params.id);
    if (!id) {
        return res.status(400).json({ error: 'Ogiltigt charter-ID.' });
    }
    try {
        const [result] = await pool.execute('DELETE FROM charters WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({
                error: 'Chartern hittades inte.',
            });
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Kunde inte ta bort charter:', error);
        return res.status(400).json({
            error: 'Kunde inte ta bort chartern.',
        });
    }
});
// --------------------------------------------------
// CREATE CHARTER MEMBER
// --------------------------------------------------
app.post('/api/charter-members', charterManager, async (req, res) => {
    const name = cleanText(req.body?.name, 180);
    if (!name) {
        return res.status(400).json({
            error: 'Medlemmen måste ha ett namn.',
        });
    }
    const id = parseStringId(req.body?.id) || makeId();
    const charterId = parseStringId(req.body?.charter_id ?? req.body?.charterId);
    const rankName = cleanText(req.body?.rank_name ?? req.body?.rankName ?? req.body?.role, 80) || 'Full Patch';
    const status = cleanText(req.body?.status, 30) || 'Active';
    const image = parseNullableText(req.body?.image, 2000000);
    const imagePosition = cleanText(req.body?.image_position ?? req.body?.imagePosition, 40) || '50% 35%';
    const joinedAt = cleanText(req.body?.joined_at ?? req.body?.joinedAt, 80) || '';
    const bio = cleanText(req.body?.bio, 10000) || '';
    try {
        await pool.execute(`INSERT INTO charter_members
       (id, name, rank_name, charter_id, status, image,
        image_position, joined_at, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            name,
            rankName,
            charterId,
            status,
            image,
            imagePosition,
            joinedAt,
            bio,
        ]);
        return res.status(201).json({
            ok: true,
            member: formatMember({
                id,
                name,
                rank_name: rankName,
                charter_id: charterId,
                status,
                image,
                image_position: imagePosition,
                joined_at: joinedAt,
                bio,
            }),
        });
    }
    catch (error) {
        console.error('Kunde inte skapa charter-medlem:', error);
        return res.status(400).json({
            error: 'Kunde inte spara medlemmen. Kontrollera charter-ID:t.',
        });
    }
});
// --------------------------------------------------
// UPDATE CHARTER MEMBER
// --------------------------------------------------
app.put('/api/charter-members/:id', charterManager, async (req, res) => {
    const id = parseStringId(req.params.id);
    const name = cleanText(req.body?.name, 180);
    if (!id) {
        return res.status(400).json({ error: 'Ogiltigt medlems-ID.' });
    }
    if (!name) {
        return res.status(400).json({
            error: 'Medlemmen måste ha ett namn.',
        });
    }
    const charterId = parseStringId(req.body?.charter_id ?? req.body?.charterId);
    const rankName = cleanText(req.body?.rank_name ?? req.body?.rankName ?? req.body?.role, 80) || 'Full Patch';
    const status = cleanText(req.body?.status, 30) || 'Active';
    const image = parseNullableText(req.body?.image, 2000000);
    const imagePosition = cleanText(req.body?.image_position ?? req.body?.imagePosition, 40) || '50% 35%';
    const joinedAt = cleanText(req.body?.joined_at ?? req.body?.joinedAt, 80) || '';
    const bio = cleanText(req.body?.bio, 10000) || '';
    try {
        const [result] = await pool.execute(`UPDATE charter_members
       SET name = ?, rank_name = ?, charter_id = ?, status = ?, image = ?,
           image_position = ?, joined_at = ?, bio = ?
       WHERE id = ?`, [
            name,
            rankName,
            charterId,
            status,
            image,
            imagePosition,
            joinedAt,
            bio,
            id,
        ]);
        if (result.affectedRows === 0) {
            const [existing] = await pool.execute('SELECT id FROM charter_members WHERE id = ? LIMIT 1', [id]);
            if (!existing.length) {
                return res.status(404).json({
                    error: 'Medlemmen hittades inte.',
                });
            }
        }
        return res.json({
            ok: true,
            member: formatMember({
                id,
                name,
                rank_name: rankName,
                charter_id: charterId,
                status,
                image,
                image_position: imagePosition,
                joined_at: joinedAt,
                bio,
            }),
        });
    }
    catch (error) {
        console.error('Kunde inte uppdatera charter-medlem:', error);
        return res.status(400).json({
            error: 'Kunde inte uppdatera medlemmen. Kontrollera charter-ID:t.',
        });
    }
});
// --------------------------------------------------
// DELETE CHARTER MEMBER
// --------------------------------------------------
app.delete('/api/charter-members/:id', charterManager, async (req, res) => {
    const id = parseStringId(req.params.id);
    if (!id) {
        return res.status(400).json({ error: 'Ogiltigt medlems-ID.' });
    }
    try {
        const [result] = await pool.execute('DELETE FROM charter_members WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({
                error: 'Medlemmen hittades inte.',
            });
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Kunde inte ta bort charter-medlem:', error);
        return res.status(400).json({
            error: 'Kunde inte ta bort medlemmen.',
        });
    }
});
// --------------------------------------------------
// ORGANISATION ARTICLES API
// --------------------------------------------------
// Hämta publicerade artiklar
app.get('/api/organisation/articles', requirePermission('organization.view'), async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT id, title, category, excerpt, content, image, date,
                featured, published, created_at, updated_at
         FROM organisation_articles
         WHERE published = 1
         ORDER BY featured DESC, created_at DESC`);
        return res.json({
            articles: rows.map(formatOrganisationArticle),
        });
    }
    catch (error) {
        console.error('Kunde inte hämta organisationsartiklar:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa organisationsartiklar från databasen.',
        });
    }
});
// Hämta samtliga artiklar för redigering
app.get('/api/organisation/admin/articles', organisationEditor, async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT id, title, category, excerpt, content, image, date,
                featured, published, created_at, updated_at
         FROM organisation_articles
         ORDER BY created_at DESC`);
        return res.json({
            articles: rows.map(formatOrganisationArticle),
        });
    }
    catch (error) {
        console.error('Kunde inte hämta administrationsartiklar:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa artiklarna från databasen.',
        });
    }
});
// Skapa artikel — låt MySQL skapa AUTO_INCREMENT-ID
app.post('/api/organisation/articles', organisationEditor, async (req, res) => {
    const article = getOrganisationArticlePayload(req.body);
    if (!article.title) {
        return res.status(400).json({
            error: 'Artikeln måste ha en rubrik.',
        });
    }
    try {
        const [result] = await pool.execute(`INSERT INTO organisation_articles
         (title, category, excerpt, content, image, date, featured, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            article.title,
            article.category,
            article.excerpt,
            article.content,
            article.image,
            article.date,
            article.featured ? 1 : 0,
            article.published ? 1 : 0,
        ]);
        const [rows] = await pool.execute(`SELECT id, title, category, excerpt, content, image, date,
                featured, published, created_at, updated_at
         FROM organisation_articles
         WHERE id = ?
         LIMIT 1`, [result.insertId]);
        if (!rows.length) {
            return res.status(500).json({
                error: 'Artikeln sparades men kunde inte läsas tillbaka.',
            });
        }
        return res.status(201).json({
            ok: true,
            article: formatOrganisationArticle(rows[0]),
        });
    }
    catch (error) {
        console.error('Kunde inte skapa organisationsartikel:', error);
        return res.status(503).json({
            error: 'Kunde inte spara artikeln i databasen.',
        });
    }
});
// Uppdatera artikel — ID måste vara ett positivt heltal
app.put('/api/organisation/articles/:id', organisationEditor, async (req, res) => {
    const id = parseOrganisationArticleId(req.params.id);
    const article = getOrganisationArticlePayload(req.body);
    if (id === null) {
        return res.status(400).json({ error: 'Ogiltigt artikel-ID.' });
    }
    if (!article.title) {
        return res.status(400).json({
            error: 'Artikeln måste ha en rubrik.',
        });
    }
    try {
        const [result] = await pool.execute(`UPDATE organisation_articles
         SET title = ?, category = ?, excerpt = ?, content = ?,
             image = ?, date = ?, featured = ?, published = ?
         WHERE id = ?`, [
            article.title,
            article.category,
            article.excerpt,
            article.content,
            article.image,
            article.date,
            article.featured ? 1 : 0,
            article.published ? 1 : 0,
            id,
        ]);
        if (!result.affectedRows) {
            const [existing] = await pool.execute('SELECT id FROM organisation_articles WHERE id = ? LIMIT 1', [id]);
            if (!existing.length) {
                return res.status(404).json({
                    error: 'Artikeln hittades inte.',
                });
            }
        }
        const [rows] = await pool.execute(`SELECT id, title, category, excerpt, content, image, date,
                featured, published, created_at, updated_at
         FROM organisation_articles
         WHERE id = ?
         LIMIT 1`, [id]);
        return res.json({
            ok: true,
            article: rows.length
                ? formatOrganisationArticle(rows[0])
                : formatOrganisationArticle({ id, ...article }),
        });
    }
    catch (error) {
        console.error('Kunde inte uppdatera organisationsartikel:', error);
        return res.status(503).json({
            error: 'Kunde inte uppdatera artikeln i databasen.',
        });
    }
});
// Ta bort artikel — ID måste vara ett positivt heltal
app.delete('/api/organisation/articles/:id', organisationEditor, async (req, res) => {
    const id = parseOrganisationArticleId(req.params.id);
    if (id === null) {
        return res.status(400).json({ error: 'Ogiltigt artikel-ID.' });
    }
    try {
        const [result] = await pool.execute('DELETE FROM organisation_articles WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({
                error: 'Artikeln hittades inte.',
            });
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Kunde inte ta bort organisationsartikel:', error);
        return res.status(503).json({
            error: 'Kunde inte ta bort artikeln från databasen.',
        });
    }
});
// --------------------------------------------------
// ORGANISATION PAGE CONTENT API
// --------------------------------------------------
// Hämta innehållssektioner
app.get('/api/organisation/page-content', requirePermission('organization.view'), async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT section_key, content, updated_at
         FROM organisation_page_content
         ORDER BY section_key ASC`);
        const content = {};
        for (const row of rows) {
            content[row.section_key] = row.content;
        }
        return res.json({ content });
    }
    catch (error) {
        console.error('Kunde inte hämta organisationssidans innehåll:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa organisationssidans innehåll.',
        });
    }
});
// Spara en innehållssektion
app.put('/api/organisation/page-content/:sectionKey', organisationEditor, async (req, res) => {
    const sectionKey = cleanText(req.params.sectionKey, 100);
    const content = typeof req.body?.content === 'string'
        ? req.body.content.slice(0, 100000)
        : null;
    if (!sectionKey || content === null) {
        return res.status(400).json({
            error: 'Ogiltig sektion eller innehåll.',
        });
    }
    try {
        await pool.execute(`INSERT INTO organisation_page_content (section_key, content)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
           content = VALUES(content),
           updated_at = CURRENT_TIMESTAMP`, [sectionKey, content]);
        return res.json({
            ok: true,
            sectionKey,
            content,
        });
    }
    catch (error) {
        console.error('Kunde inte spara organisationsinnehåll:', error);
        return res.status(503).json({
            error: 'Kunde inte spara innehållet i databasen.',
        });
    }
});
// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------
app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'Devils Mercy API',
    });
});
// --------------------------------------------------
// CURRENT USER / SESSION / PERMISSIONS / ROLE DETAILS
// --------------------------------------------------
app.get('/api/auth/me', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const context = await loadAuthContext(req);
        if (!context) {
            return res.json({
                authenticated: false,
                user: null,
                roles: [],
                roleDetails: [],
                permissions: [],
                isVisitor: false,
            });
        }
        return res.json({
            authenticated: true,
            user: context.user,
            roles: context.roles,
            roleDetails: context.roleDetails,
            permissions: context.permissions,
            isVisitor: context.isVisitor,
        });
    }
    catch (error) {
        console.error('Kunde inte kontrollera Discord-roller:', error);
        return res.status(503).json({
            error: 'Kunde inte verifiera behörigheten med Discord.',
        });
    }
});
// --------------------------------------------------
// DISCORD OAUTH LOGIN
// --------------------------------------------------
app.get('/auth/discord', (req, res) => {
    const state = crypto.randomBytes(32).toString('hex');
    const currentSession = req.session;
    currentSession.oauthState = state;
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify',
        state,
    });
    req.session.save((error) => {
        if (error) {
            console.error('Kunde inte spara session:', error);
            return res.status(500).send('Kunde inte starta Discord-inloggningen.');
        }
        return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
    });
});
// --------------------------------------------------
// DISCORD OAUTH CALLBACK
// --------------------------------------------------
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    const returnedState = req.query.state;
    const currentSession = req.session;
    const savedState = currentSession.oauthState;
    if (typeof code !== 'string' || typeof returnedState !== 'string') {
        return res.redirect(`${FRONTEND_URL}/?login=cancelled`);
    }
    if (!savedState || returnedState !== savedState) {
        return res.status(403).send('Ogiltig OAuth state. Försök logga in igen.');
    }
    delete currentSession.oauthState;
    try {
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
            signal: AbortSignal.timeout(10000),
        });
        const tokenData = (await tokenResponse.json());
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Discord tokenfel:', tokenData.error);
            return res.redirect(`${FRONTEND_URL}/?login=failed`);
        }
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!userResponse.ok) {
            return res.redirect(`${FRONTEND_URL}/?login=failed`);
        }
        const discordUser = (await userResponse.json());
        await new Promise((resolve, reject) => {
            req.session.regenerate((error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
        const newSession = req.session;
        newSession.discordUser = {
            id: discordUser.id,
            username: discordUser.username,
            global_name: discordUser.global_name,
            avatar: discordUser.avatar,
        };
        await new Promise((resolve, reject) => {
            req.session.save((error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
        return res.redirect(`${FRONTEND_URL}/?login=success`);
    }
    catch (error) {
        console.error('Discord OAuth-fel:', error);
        return res.redirect(`${FRONTEND_URL}/?login=failed`);
    }
});
// --------------------------------------------------
// LOGOUT
// --------------------------------------------------
app.post('/auth/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                error: 'Kunde inte logga ut.',
            });
        }
        res.clearCookie('dm.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        return res.json({ ok: true });
    });
});
// --------------------------------------------------
// OTHER PROTECTED API ROUTES
// --------------------------------------------------
app.get('/api/members', requirePermission('members.view'), async (_req, res) => {
    return res.json({
        members: [],
        message: 'Koppla denna endpoint till medlemsdatabasen.',
    });
});
app.post('/api/members', requirePermission('members.manage'), async (_req, res) => {
    return res.status(501).json({
        error: 'Medlemslagringen behöver kopplas in.',
    });
});
// --------------------------------------------------
// APPLICATION SUBMISSION
// --------------------------------------------------
app.post('/api/applications', async (req, res) => {
    const user = req.session.discordUser;
    if (!user) {
        return res.status(401).json({
            error: 'Du måste logga in med Discord först.',
        });
    }
    if (!BOT_TOKEN ||
        !GUILD_ID ||
        !process.env.DISCORD_APPLICATIONS_CHANNEL_ID) {
        return res.status(503).json({
            error: 'Discord-ansökningskanalen är inte konfigurerad på servern.',
        });
    }
    const body = req.body;
    if (body.type !== 'hangaround') {
        return res.status(400).json({
            error: 'Den här ansökningsvägen tar just nu endast emot Hangaround-ansökningar.',
        });
    }
    const a = body.answers ?? {};
    const clean = (key, max = 1000) => typeof a[key] === 'string'
        ? a[key].trim().slice(0, max)
        : '';
    const age = clean('age', 3);
    const nationality = clean('nationality', 100);
    const timezone = clean('timezone', 100);
    const heardAbout = clean('heardAbout', 1000);
    const experience = clean('experience', 1500);
    const charter = clean('charter', 150);
    const rules = a.rules === 'yes' ? 'Yes' : '';
    if (!age ||
        !nationality ||
        !timezone ||
        !heardAbout ||
        !experience ||
        !charter ||
        !rules) {
        return res.status(400).json({
            error: 'Fyll i samtliga frågor och godkänn reglerna innan du skickar.',
        });
    }
    const applicationId = crypto.randomUUID();
    const answerData = {
        age,
        nationality,
        timezone,
        heardAbout,
        experience,
        rules,
        charter,
    };
    const fields = [
        { name: 'Age', value: age, inline: true },
        { name: 'Nationality', value: nationality, inline: true },
        { name: 'Timezone', value: timezone, inline: true },
        {
            name: 'How did you hear about us?',
            value: heardAbout,
            inline: false,
        },
        {
            name: 'Previous FiveM RP experience',
            value: experience,
            inline: false,
        },
        { name: 'Rules accepted', value: 'Yes', inline: true },
        { name: 'Charter', value: charter, inline: true },
    ].map((field) => ({
        ...field,
        value: field.value.slice(0, 1024),
    }));
    try {
        await pool.execute(`INSERT INTO applications
       (id, applicant_discord_id, applicant_username, application_type, answers, status)
       VALUES (?, ?, ?, 'hangaround', ?, 'pending')`, [applicationId, user.id, user.username, JSON.stringify(answerData)]);
        await pool.execute(`INSERT INTO application_logs
       (application_id, event_type, actor_discord_id, actor_username, details)
       VALUES (?, 'submitted', ?, ?, ?)`, [
            applicationId,
            user.id,
            user.username,
            JSON.stringify({ source: 'website' }),
        ]);
        const discordResponse = await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_APPLICATIONS_CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [
                    {
                        title: 'Devils Mercy | Hangaround Application',
                        color: 0xc51f30,
                        description: `**Applicant:** <@${user.id}>\n` +
                            `**Discord:** ${user.username}\n` +
                            `**Status:** Pending review\n` +
                            `**Application ID:** ${applicationId}`,
                        fields,
                        footer: {
                            text: `Devils Mercy • Application ID: ${applicationId}`,
                        },
                        timestamp: new Date().toISOString(),
                    },
                ],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 3,
                                label: 'Approve',
                                custom_id: `dm_application_approve:${applicationId}`,
                            },
                            {
                                type: 2,
                                style: 4,
                                label: 'Reject',
                                custom_id: `dm_application_reject:${applicationId}`,
                            },
                        ],
                    },
                ],
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!discordResponse.ok) {
            const detail = await discordResponse.text().catch(() => '');
            console.error('Discord application post failed:', discordResponse.status, detail.slice(0, 500));
            await pool.execute(`UPDATE applications
         SET decision_note = ?
         WHERE id = ? AND status = 'pending'`, [
                'Discord-publicering misslyckades; kontrollera loggen och skicka om manuellt vid behov',
                applicationId,
            ]);
            await pool.execute(`INSERT INTO application_logs (application_id, event_type, details)
         VALUES (?, 'error', ?)`, [
                applicationId,
                JSON.stringify({
                    source: 'discord-post',
                    httpStatus: discordResponse.status,
                }),
            ]);
            return res.status(502).json({
                error: 'Discord kunde inte ta emot ansökan. Försök igen senare.',
            });
        }
        const message = (await discordResponse.json());
        await pool.execute(`UPDATE applications
       SET discord_channel_id = ?, discord_message_id = ?
       WHERE id = ?`, [
            process.env.DISCORD_APPLICATIONS_CHANNEL_ID,
            message.id,
            applicationId,
        ]);
        await pool.execute(`INSERT INTO application_logs (application_id, event_type, details)
       VALUES (?, 'discord_posted', ?)`, [
            applicationId,
            JSON.stringify({
                channelId: process.env.DISCORD_APPLICATIONS_CHANNEL_ID,
                messageId: message.id,
            }),
        ]);
        return res.status(201).json({
            ok: true,
            applicationId,
            messageId: message.id,
        });
    }
    catch (error) {
        console.error('Application submission failed:', error);
        return res.status(502).json({
            error: 'Kunde inte kontakta Discord. Försök igen senare.',
        });
    }
});
// --------------------------------------------------
// APPLICATION LIST
// --------------------------------------------------
app.get('/api/applications', requirePermission('applications.view'), async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT
           id,
           applicant_discord_id AS applicantDiscordId,
           applicant_username AS applicantUsername,
           application_type AS applicationType,
           applicant_name AS applicantName,
           answers,
           status,
           submitted_at AS submittedAt,
           decided_at AS decidedAt,
           decided_by_discord_id AS decidedByDiscordId,
           decided_by_username AS decidedByUsername,
           decision_note AS decisionNote
         FROM applications
         ORDER BY submitted_at DESC
         LIMIT 500`);
        return res.json({
            applications: rows.map((row) => ({
                ...row,
                answers: typeof row.answers === 'string'
                    ? JSON.parse(row.answers)
                    : row.answers,
            })),
        });
    }
    catch (error) {
        console.error('Could not load SQL applications:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa ansökningar från databasen.',
        });
    }
});
// --------------------------------------------------
// LEADERSHIP AND WEBSITE ADMIN
// --------------------------------------------------
app.get('/api/leadership', requirePermission('leadership.manage'), async (_req, res) => {
    return res.json({ authorized: true });
});
app.get('/api/website-admin', requirePermission('website.manage'), async (_req, res) => {
    return res.json({ authorized: true });
});
// --------------------------------------------------
// START SERVER
// --------------------------------------------------
verifyDatabase()
    .then(() => {
    console.log('SQL-databasen är ansluten.');
    app.listen(PORT, () => {
        console.log(`Devils Mercy API körs på http://localhost:${PORT}`);
    });
})
    .catch((error) => {
    console.error('Kunde inte ansluta till SQL-databasen:', error);
    process.exit(1);
});
