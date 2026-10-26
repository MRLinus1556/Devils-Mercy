/**
 * Backend integration template for server/src/index.ts.
 * This is intentionally a route module template: mount it only after the existing
 * express-session middleware and use the project's real pool + loadAuthContext.
 * Never trust roles supplied by the browser.
 */
import crypto from 'node:crypto';
import { Router } from 'express';
export function makeChartersRouter(pool, loadAuthContext) {
    const router = Router();
    const manager = async (req, res, next) => {
        try {
            const context = await loadAuthContext(req); // fetches current roles from Discord
            if (!context)
                return res.status(401).json({ error: 'Du måste logga in med Discord.' });
            if (!context.roles.some((r) => ['President', 'Vice President', 'Officer'].includes(r)))
                return res.status(403).json({ error: 'Endast President, Vice President och Officer får ändra Charters.' });
            req.charterAuth = context;
            next();
        }
        catch (e) {
            return res.status(503).json({ error: 'Kunde inte verifiera Discord-behörigheten.' });
        }
    };
    const fields = `id, name, short_name AS shortName, location, country, flag, server_name AS server, status, description, image, founded`;
    router.get('/', async (_req, res) => {
        try {
            const [charters] = await pool.query(`SELECT ${fields} FROM charters ORDER BY name`);
            const [members] = await pool.query(`SELECT id, name, rank_name AS rank, charter_id AS charterId, status, image, image_position AS imagePosition, joined_at AS joinedAt, bio FROM charter_members ORDER BY name`);
            res.json({ charters, members });
        }
        catch (e) {
            res.status(500).json({ error: 'Kunde inte läsa Charters.' });
        }
    });
    router.get('/members', async (_req, res) => {
        try {
            const [members] = await pool.query(`SELECT id, name, rank_name AS rank, charter_id AS charterId, status, image, image_position AS imagePosition, joined_at AS joinedAt, bio FROM charter_members ORDER BY name`);
            res.json({ members });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte läsa medlemmar.' });
        }
    });
    router.post('/', manager, async (req, res) => {
        try {
            const d = req.body || {};
            const id = `charter-${crypto.randomUUID()}`;
            await pool.execute('INSERT INTO charters (id,name,short_name,location,country,flag,server_name,status,description,image,founded) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [id, d.name, d.shortName || '', d.location || '', d.country || '', d.flag || '', d.server || '', d.status || 'Active', d.description || '', d.image || null, d.founded || '']);
            res.status(201).json({ id });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte skapa Charter.' });
        }
    });
    router.put('/:id', manager, async (req, res) => {
        try {
            const d = req.body || {};
            const [result] = await pool.execute('UPDATE charters SET name=?,short_name=?,location=?,country=?,flag=?,server_name=?,status=?,description=?,image=?,founded=? WHERE id=?', [d.name, d.shortName || '', d.location || '', d.country || '', d.flag || '', d.server || '', d.status || 'Active', d.description || '', d.image || null, d.founded || '', req.params.id]);
            if (!result.affectedRows)
                return res.status(404).json({ error: 'Charter hittades inte.' });
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte uppdatera Charter.' });
        }
    });
    router.delete('/:id', manager, async (req, res) => {
        try {
            const [result] = await pool.execute('DELETE FROM charters WHERE id=?', [req.params.id]);
            if (!result.affectedRows)
                return res.status(404).json({ error: 'Charter hittades inte.' });
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte ta bort Charter.' });
        }
    });
    router.post('/members', manager, async (req, res) => {
        try {
            const d = req.body || {};
            const id = `member-${crypto.randomUUID()}`;
            await pool.execute('INSERT INTO charter_members (id,name,rank_name,charter_id,status,image,image_position,joined_at,bio) VALUES (?,?,?,?,?,?,?,?,?)', [id, d.name, d.rank || 'Full Patch', d.charterId || null, d.status || 'Active', d.image || null, d.imagePosition || '50% 35%', d.joinedAt || '', d.bio || '']);
            res.status(201).json({ id });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte skapa medlem.' });
        }
    });
    router.put('/members/:id', manager, async (req, res) => {
        try {
            const d = req.body || {};
            const [r] = await pool.execute('UPDATE charter_members SET name=?,rank_name=?,charter_id=?,status=?,image=?,image_position=?,joined_at=?,bio=? WHERE id=?', [d.name, d.rank || 'Full Patch', d.charterId || null, d.status || 'Active', d.image || null, d.imagePosition || '50% 35%', d.joinedAt || '', d.bio || '', req.params.id]);
            if (!r.affectedRows)
                return res.status(404).json({ error: 'Medlem hittades inte.' });
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte uppdatera medlem.' });
        }
    });
    router.delete('/members/:id', manager, async (req, res) => {
        try {
            const [r] = await pool.execute('DELETE FROM charter_members WHERE id=?', [req.params.id]);
            if (!r.affectedRows)
                return res.status(404).json({ error: 'Medlem hittades inte.' });
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: 'Kunde inte ta bort medlem.' });
        }
    });
    return router;
}
