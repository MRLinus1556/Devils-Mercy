import { Router } from 'express';
import { pool } from '../db.js';
export const chartersRouter = Router();
function cleanText(value, maxLength = 255) {
    if (typeof value !== 'string')
        return null;
    const result = value.trim().slice(0, maxLength);
    return result || null;
}
function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
// GET /api/charters
chartersRouter.get('/', async (_req, res) => {
    try {
        const [charters] = await pool.query(`SELECT id, name, description, image, created_at
       FROM charters
       ORDER BY name ASC`);
        const [members] = await pool.query(`SELECT id, charter_id, name, role, image
       FROM charter_members
       ORDER BY name ASC`);
        return res.json({
            charters,
            members,
        });
    }
    catch (error) {
        console.error('Kunde inte hämta charters:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa charters från databasen. Kontrollera tabellerna.',
        });
    }
});
// GET /api/charter-members
chartersRouter.get('/members', async (_req, res) => {
    try {
        const [members] = await pool.query(`SELECT id, charter_id, name, role, image
       FROM charter_members
       ORDER BY name ASC`);
        return res.json({ members });
    }
    catch (error) {
        console.error('Kunde inte hämta charter-medlemmar:', error);
        return res.status(503).json({
            error: 'Kunde inte läsa charter-medlemmar från databasen.',
        });
    }
});
// POST /api/charters
chartersRouter.post('/', async (req, res) => {
    const name = cleanText(req.body?.name, 120);
    const description = cleanText(req.body?.description, 5000);
    const image = cleanText(req.body?.image, 2000);
    if (!name) {
        return res.status(400).json({ error: 'Chartern måste ha ett namn.' });
    }
    try {
        const [result] = await pool.execute(`INSERT INTO charters (name, description, image)
       VALUES (?, ?, ?)`, [name, description, image]);
        return res.status(201).json({
            ok: true,
            charter: {
                id: result.insertId,
                name,
                description,
                image,
            },
        });
    }
    catch (error) {
        console.error('Kunde inte skapa charter:', error);
        return res.status(503).json({
            error: 'Kunde inte spara chartern. Kontrollera databastabellen.',
        });
    }
});
// PUT /api/charters/:id
chartersRouter.put('/:id', async (req, res) => {
    const id = validId(req.params.id);
    const name = cleanText(req.body?.name, 120);
    const description = cleanText(req.body?.description, 5000);
    const image = cleanText(req.body?.image, 2000);
    if (!id)
        return res.status(400).json({ error: 'Ogiltigt charter-ID.' });
    if (!name)
        return res.status(400).json({ error: 'Chartern måste ha ett namn.' });
    try {
        const [result] = await pool.execute(`UPDATE charters
       SET name = ?, description = ?, image = ?
       WHERE id = ?`, [name, description, image, id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Chartern hittades inte.' });
        }
        return res.json({
            ok: true,
            charter: { id, name, description, image },
        });
    }
    catch (error) {
        console.error('Kunde inte uppdatera charter:', error);
        return res.status(503).json({ error: 'Kunde inte uppdatera chartern.' });
    }
});
// DELETE /api/charters/:id
chartersRouter.delete('/:id', async (req, res) => {
    const id = validId(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'Ogiltigt charter-ID.' });
    try {
        const [result] = await pool.execute('DELETE FROM charters WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Chartern hittades inte.' });
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Kunde inte ta bort charter:', error);
        return res.status(503).json({ error: 'Kunde inte ta bort chartern.' });
    }
});
// POST /api/charter-members
chartersRouter.post('/members', async (req, res) => {
    const charterId = Number(req.body?.charterId);
    const name = cleanText(req.body?.name, 120);
    const role = cleanText(req.body?.role, 120);
    const image = cleanText(req.body?.image, 2000);
    if (!Number.isSafeInteger(charterId) || charterId <= 0 || !name) {
        return res.status(400).json({
            error: 'Ett giltigt charter-ID och medlemsnamn krävs.',
        });
    }
    try {
        const [result] = await pool.execute(`INSERT INTO charter_members (charter_id, name, role, image)
       VALUES (?, ?, ?, ?)`, [charterId, name, role, image]);
        return res.status(201).json({
            ok: true,
            member: {
                id: result.insertId,
                charter_id: charterId,
                name,
                role,
                image,
            },
        });
    }
    catch (error) {
        console.error('Kunde inte lägga till charter-medlem:', error);
        return res.status(503).json({
            error: 'Kunde inte spara medlemmen. Kontrollera databastabellen.',
        });
    }
});
// PUT /api/charter-members/:id
chartersRouter.put('/members/:id', async (req, res) => {
    const id = validId(req.params.id);
    const charterId = Number(req.body?.charterId);
    const name = cleanText(req.body?.name, 120);
    const role = cleanText(req.body?.role, 120);
    const image = cleanText(req.body?.image, 2000);
    if (!id)
        return res.status(400).json({ error: 'Ogiltigt medlems-ID.' });
    if (!Number.isSafeInteger(charterId) || charterId <= 0 || !name) {
        return res.status(400).json({
            error: 'Ett giltigt charter-ID och medlemsnamn krävs.',
        });
    }
    try {
        const [result] = await pool.execute(`UPDATE charter_members
       SET charter_id = ?, name = ?, role = ?, image = ?
       WHERE id = ?`, [charterId, name, role, image, id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Medlemmen hittades inte.' });
        }
        return res.json({
            ok: true,
            member: { id, charter_id: charterId, name, role, image },
        });
    }
    catch (error) {
        console.error('Kunde inte uppdatera charter-medlem:', error);
        return res.status(503).json({ error: 'Kunde inte uppdatera medlemmen.' });
    }
});
// DELETE /api/charter-members/:id
chartersRouter.delete('/members/:id', async (req, res) => {
    const id = validId(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'Ogiltigt medlems-ID.' });
    try {
        const [result] = await pool.execute('DELETE FROM charter_members WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Medlemmen hittades inte.' });
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Kunde inte ta bort charter-medlem:', error);
        return res.status(503).json({ error: 'Kunde inte ta bort medlemmen.' });
    }
});
