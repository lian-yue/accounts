import model from './model'
import { Schema } from 'mongoose'

const schema = new Schema({
  message: {
    type: Schema.Types.Integer,
    default: 0,
  },
});



schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret._id
  }
});


export default model('Meta', schema)
