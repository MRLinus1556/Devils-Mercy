import { Router } from 'express';
export function createOrganisationRouter(pool, requirePermission) {
    const router = Router();
    const admin = requirePermission('website.manage');
    router.get('/articles', async (req, res) => {
        try {
            const category = String(req.query.category || '').trim();
            const params = [];
            let sql = `SELECT id, title, category, excerpt, content, image,
        DATE_FORMAT(article_date, '%Y-%m-%d') AS date, featured, published, sort_order AS sortOrder
        FROM organisation_articles WHERE published = 1`;
            if (category && category !== 'All') {
                sql += ' AND category = ?';
                params.push(category);
            }
            sql += ' ORDER BY featured DESC, sort_order ASC, article_date DESC, id DESC';
            const [rows] = await pool.query(sql, params);
            return res.json({ articles: rows.map(row => ({ ...row, featured: Boolean(row.featured), published: Boolean(row.published) })) });
        }
        catch (error) {
            console.error('Organisation articles read failed:', error);
            return res.status(503).json({ error: 'Kunde inte läsa organisationens artiklar.' });
        }
    });
    router.get('/content', async (_req, res) => {
        try {
            const [rows] = await pool.query('SELECT content_key AS `key`, content_value AS value FROM organisation_page_content');
            const content = {};
            for (const row of rows)
                content[String(row.key)] = row.value == null ? '' : String(row.value);
            return res.json({ content });
        }
        catch (error) {
            console.error('Organisation content read failed:', error);
            return res.status(503).json({ error: 'Kunde inte läsa organisationens sidinnehåll.' });
        }
    });
    router.get('/admin/articles', admin, async (_req, res) => {
        try {
            const [rows] = await pool.query(`SELECT id, title, category, excerpt, content, image,
        DATE_FORMAT(article_date, '%Y-%m-%d') AS date, featured, published, sort_order AS sortOrder
        FROM organisation_articles ORDER BY updated_at DESC, id DESC`);
            return res.json({ articles: rows.map(row => ({ ...row, featured: Boolean(row.featured), published: Boolean(row.published) })) });
        }
        catch (error) {
            console.error('Organisation admin articles read failed:', error);
            return res.status(503).json({ error: 'Kunde inte läsa artiklarna.' });
        }
    });
    router.post('/articles', admin, async (req, res) => {
        const article = validateArticle(req.body);
        if (!article)
            return res.status(400).json({ error: 'Titel, kategori och innehåll krävs.' });
        try {
            const [result] = await pool.execute(`INSERT INTO organisation_articles
        (title, category, excerpt, content, image, article_date, featured, published, sort_order, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [article.title, article.category, article.excerpt, article.content,
                article.image, article.date || null, article.featured, article.published, article.sortOrder, actor(req), actor(req)]);
            return res.status(201).json({ article: { ...article, id: result.insertId } });
        }
        catch (error) {
            console.error('Organisation article create failed:', error);
            return res.status(503).json({ error: 'Kunde inte spara artikeln.' });
        }
    });
    router.put('/articles/:id', admin, async (req, res) => {
        const id = Number(req.params.id);
        const article = validateArticle(req.body);
        if (!Number.isSafeInteger(id) || id < 1)
            return res.status(400).json({ error: 'Ogiltigt artikel-ID.' });
        if (!article)
            return res.status(400).json({ error: 'Titel, kategori och innehåll krävs.' });
        try {
            const [result] = await pool.execute(`UPDATE organisation_articles SET title=?, category=?, excerpt=?, content=?,
        image=?, article_date=?, featured=?, published=?, sort_order=?, updated_by=? WHERE id=?`, [article.title, article.category,
                article.excerpt, article.content, article.image, article.date || null, article.featured, article.published,
                article.sortOrder, actor(req), id]);
            if (!result.affectedRows)
                return res.status(404).json({ error: 'Artikeln hittades inte.' });
            return res.json({ article: { ...article, id } });
        }
        catch (error) {
            console.error('Organisation article update failed:', error);
            return res.status(503).json({ error: 'Kunde inte uppdatera artikeln.' });
        }
    });
    router.delete('/articles/:id', admin, async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            return res.status(400).json({ error: 'Ogiltigt artikel-ID.' });
        try {
            const [result] = await pool.execute('DELETE FROM organisation_articles WHERE id=?', [id]);
            if (!result.affectedRows)
                return res.status(404).json({ error: 'Artikeln hittades inte.' });
            return res.json({ ok: true });
        }
        catch (error) {
            console.error('Organisation article delete failed:', error);
            return res.status(503).json({ error: 'Kunde inte ta bort artikeln.' });
        }
    });
    router.put('/content', admin, async (req, res) => {
        const content = req.body?.content;
        if (!content || typeof content !== 'object' || Array.isArray(content)) {
            return res.status(400).json({ error: 'content måste vara ett objekt med nyckel/värde.' });
        }
        const entries = Object.entries(content);
        if (entries.length > 100)
            return res.status(400).json({ error: 'För många innehållsfält.' });
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            for (const [key, rawValue] of entries) {
                if (!/^[a-zA-Z0-9_-]{1,100}$/.test(key))
                    throw new Error(`Ogiltig innehållsnyckel: ${key}`);
                const value = rawValue == null ? '' : String(rawValue).slice(0, 100000);
                await connection.execute(`INSERT INTO organisation_page_content (content_key, content_value, updated_by)
          VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content_value=VALUES(content_value), updated_by=VALUES(updated_by)`, [key, value, actor(req)]);
            }
            await connection.commit();
            return res.json({ ok: true });
        }
        catch (error) {
            await connection.rollback();
            console.error('Organisation content update failed:', error);
            return res.status(400).json({ error: 'Kunde inte spara sidinnehållet.' });
        }
        finally {
            connection.release();
        }
    });
    return router;
}
function actor(req) {
    const context = req.authContext;
    return context?.user?.username || context?.user?.global_name || context?.user?.id || null;
}
function validateArticle(body) {
    if (!body || typeof body !== 'object')
        return null;
    const title = String(body.title || '').trim().slice(0, 220);
    const category = String(body.category || '').trim().slice(0, 80);
    const content = String(body.content || '');
    if (!title || !category || !content.trim())
        return null;
    const date = String(body.date || '').trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return null;
    return {
        title, category,
        excerpt: String(body.excerpt || '').slice(0, 20000),
        content: content.slice(0, 500000),
        image: String(body.image || '').slice(0, 1000),
        date,
        featured: Boolean(body.featured) ? 1 : 0,
        published: body.published === false ? 0 : 1,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0,
    };
}
