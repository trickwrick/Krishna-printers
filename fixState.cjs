const fs = require('fs');
let code = fs.readFileSync('src/PaperStockManagement.jsx', 'utf8');

// 1. Add states
if (!code.includes('const [stockHistory, setStockHistory] = useState([]);')) {
  code = code.replace(
    'const [viewingStock, setViewingStock] = useState(null);',
    'const [viewingStock, setViewingStock] = useState(null);\n  const [stockHistory, setStockHistory] = useState([]);\n  const [loadingHistory, setLoadingHistory] = useState(false);'
  );
}

// 2. Add useEffect
const fetchHistoryLogic = `
  useEffect(() => {
    if (viewingStock) {
      setLoadingHistory(true);
      fetch(\`\${API_BASE_URL}/api/paper-stock/transactions\`)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(t => t.stockId === viewingStock._id && t.transactionType === 'add');
          setStockHistory(filtered);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingHistory(false);
        });
    } else {
      setStockHistory([]);
    }
  }, [viewingStock]);
`;

if (!code.includes('setLoadingHistory(true)')) {
    code = code.replace(
        'const fetchStock = async () => {',
        fetchHistoryLogic + '\n\n  const fetchStock = async () => {'
    );
}

fs.writeFileSync('src/PaperStockManagement.jsx', code);
console.log('Fixed states and useEffect');
