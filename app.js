const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv'); 
const xml2js = require('xml2js');

const app = express();
const PORT = 5000;

// Serve i file statici (HTML, CSS, JS lato client) dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Percorsi assoluti per i file di dati
const DB_JSON = path.join(__dirname, 'data', 'magazzino.json');
const IMPORT_XML = path.join(__dirname, 'data', 'carico_merce.xml');

// GET: Legge il file JSON e lo restituisce come array di oggetti
app.get('/prodotti', async (req, res) => {
    try {
        const data = await fs.readFile(DB_JSON, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).send("Errore nella lettura del database.");
    }
});

// GET: Converte il database JSON in un file CSV e avvia il download
app.get('/esporta-csv', async (req, res) => {
    try {
        const data = await fs.readFile(DB_JSON, 'utf8');
        const prodotti = JSON.parse(data);
        
        // Configurazione parser: punto e virgola come separatore per Excel italiano
        const opts = { delimiter: ';', quote: '' }; 
        const parser = new Parser(opts);
        const csv = parser.parse(prodotti);
        
        res.header('Content-Type', 'text/csv');
        res.attachment('magazzino.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).send("Errore nella generazione del CSV.");
    }
});

// POST: Legge il file XML, lo converte in oggetto e lo aggiunge al JSON esistente
app.post('/importa-xml', async (req, res) => {
    try {
        // Legge e parsa l'XML
        const xmlContent = await fs.readFile(IMPORT_XML, 'utf8');
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlContent);
        
        // Estrae gli articoli (gestisce sia un singolo articolo che una lista)
        const nuovi = Array.isArray(result.lista.articolo) ? result.lista.articolo : [result.lista.articolo];
        
        // Recupera i dati esistenti
        let vecchi = [];
        try {
            const data = await fs.readFile(DB_JSON, 'utf8');
            vecchi = JSON.parse(data);
        } catch (e) { vecchi = []; }

        // Unisce i dati e salva sul file JSON
        const databaseAggiornato = [...vecchi, ...nuovi];
        await fs.writeFile(DB_JSON, JSON.stringify(databaseAggiornato, null, 2));
        
        // Torna alla pagina principale dopo l'operazione
        res.redirect('/'); 
    } catch (err) {
        res.status(500).send("Errore nell'importazione XML. Verifica il file data/carico_merce.xml.");
    }
});

app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));