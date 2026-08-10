
import mongoose from 'mongoose';
mongoose.connect('mongodb://trickwrickjaipur_db_user:SbgtnilMq9FWBRHB@ac-yl3veud-shard-00-00.fsjjtxt.mongodb.net:27017,ac-yl3veud-shard-00-01.fsjjtxt.mongodb.net:27017,ac-yl3veud-shard-00-02.fsjjtxt.mongodb.net:27017/krishna_printers?tls=true&replicaSet=atlas-tossno-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
const JobCard = mongoose.model('JobCard', new mongoose.Schema({}, { strict: false }));
JobCard.find({ deletedAt: { $ne: null } }).lean().then(docs => {
  console.log('Docs with deletedAt:', docs.length);
  console.log(docs.map(d => ({ _id: d._id, isDeleted: d.isDeleted, deletedAt: d.deletedAt })));
  mongoose.disconnect();
});

