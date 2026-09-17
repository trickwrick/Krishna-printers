const fs = require('fs');
let code = fs.readFileSync('server/models/PaperStockTransaction.js', 'utf8');

if (!code.includes('challanNo:')) {
    code = code.replace(
        'jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: \\'JobCard\\' },',
        'jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: \\'JobCard\\' },\n  challanNo: { type: String, trim: true, default: \\'\\' },\n  invoiceNo: { type: String, trim: true, default: \\'\\' },'
    );
    fs.writeFileSync('server/models/PaperStockTransaction.js', code);
    console.log('Added challanNo and invoiceNo to model');
}
