import utils from 'mongoose/lib/utils'
import configMongodb from 'config/mongodb'
import mongoose, { Document, Schema, SchemaType } from 'mongoose'

mongoose.Promise = global.Promise;

const db = mongoose.createConnection(configMongodb, {noVirtualId: true, useNestedStrict: true,id: false});


// 数字类型
function Integer(key, options) {
  SchemaType.call(this, key, options, 'Integer')
}
Integer.prototype = Object.create(Schema.Types.Number.prototype);


Integer.prototype.cast = function(value) {
  var _value = parseInt(value);
  if (isNaN(_value)) {
    throw new Error(`Integer: ${value} is not a integer`);
  }
  return _value;
}
Schema.Types.Integer = Integer;



;(function(Schema) {
  if (Schema.prototype.preOriginal) {
    return;
  }

  Schema.prototype.preOriginal = Schema.prototype.pre
  Schema.prototype.postOriginal = Schema.prototype.post

  Schema.prototype.pre = function(name, isAsync, fn, errorCb) {
    if (arguments.length == 2 && isAsync.length == 0) {
      fn = function(next) {
        var result = isAsync.apply(this, []);
        if (result && result.then) {
          result.then(() => {
            next();
          }, next);
        } else {
          next()
        }
      }
      return this.preOriginal.apply(this, [name, fn])
    }
    return this.preOriginal.apply(this, arguments)
  }

  Schema.prototype.post = function(name, isAsync, fn) {
    if (arguments.length == 2 && isAsync.length == 0) {
      fn = function(doc, next) {
        var result = isAsync.apply(this, []);
        if (result && result.then) {
          result.then(() => {
            next();
          }, next);
        } else {
          next()
        }
      }
      return this.postOriginal.apply(this, [name, fn])
    }
    return this.postOriginal.apply(this, arguments)
  }
})(Schema)







SchemaType.prototype.doValidate = function(value, fn, scope) {
  var err = false,
      path = this.path,
      count = this.validators.length;

  if (!count) {
    return fn(null);
  }

  var validate = function(ok, validatorProperties) {
    if (err) {
      return;
    }
    if (ok === void 0 || ok) {
      --count || fn(null);
    } else {
      err = new mongoose.Error.ValidatorError(validatorProperties);
      fn(err);
    }
  };

  var _this = this;
  this.validators.forEach(function(v) {
    if (err) {
      return;
    }

    var validator = v.validator;

    var validatorProperties = utils.clone(v);
    validatorProperties.path = path
    validatorProperties.value = value

    if (validator instanceof RegExp) {
      validate(validator.test(value), validatorProperties);
    } else if (typeof validator === 'function') {
      if (value === void 0 && !_this.isRequired) {
        validate(true, validatorProperties);
        return;
      }
      if (validator.length === 2) {
        var isReturn = false
        var returnVal = validator.call(scope, value, function(ok, customMsg) {
          if (isReturn) {
            return
          }
          isReturn = true
          if (typeof returnVal === 'boolean') {
            return;
          }
          if (customMsg) {
            validatorProperties.message = customMsg;
          }
          validate(ok, validatorProperties);
        });
        if (typeof returnVal === 'boolean') {
          validate(returnVal, validatorProperties);
        } else if (returnVal instanceof Promise) {
          returnVal.then(function(ok) {
            if (isReturn) {
              return
            }
            isReturn = true
            validate(ok, validatorProperties)
          }, function(e) {
            if (isReturn) {
              return
            }
            isReturn = true
            validatorProperties.message = e.message
            validate(false, validatorProperties)
          })
        }
      } else {
        validate(validator.call(scope, value), validatorProperties);
      }
    }
  });
};





Document.prototype.savePost = function(fn) {
  this.$_savePosts = this.$_savePosts || []
  this.$_savePosts.push(fn)
  return this
}

Document.prototype.removePost = function(fn) {
  this.$_removePosts = this.$_removePosts || []
  this.$_removePosts.push(fn)
  return this
}


Document.prototype.setToken = function(token) {
  this.$_token = token
  return this
}

Document.prototype.getToken = function() {
  return this.$_token
}


Document.prototype.cans = async function(...args) {
  for (var i = 0; i < args.length; i++) {
    var arg = args[i]
    if (!Array.isArray(arg)) {
      arg = [arg]
    }
    if (!await this.can(...arg)) {
      return false
    }
  }
  return true
}

Document.prototype.cansThrow = async function(...args) {
  if (!(await this.cans(...args))) {
    var e = new Error('无权限')
    e.code = 'invalid_scope'
    e.status = 403
    throw e
  }
}

Document.prototype.canThrow = async function(...args) {
  if (!(await this.can(...args))) {
    var e = new Error('无权限')
    e.code = 'invalid_scope'
    e.status = 403
    throw e;
  }
}

export default function(name, schema, options) {
  if (schema instanceof Schema) {
    if (options) {
      for (let key in options) {
        schema.set(key, options[key])
      }
    }
  } else {
    schema = new Schema(schema, options || {});
  }


  schema.post('save', async function() {
    var savePosts = this.$_savePosts || []
    var removePosts = this.$_removePosts || []
    delete this.$_savePosts
    delete this.$_removePosts
    this.$_savePosts = []
    this.$_removePosts = []

    for (let i = 0; i < savePosts.length; i++) {
      let item = savePosts[i];
      if (!item) {
        continue
      }

      try {
        if (typeof item == 'function') {
          await item.call(this)
        } else {
          await item.save()
        }
      } catch (e) {
        throw e
      }
    }

    for (let i = 0; i < removePosts.length; i++) {
      let item = removePosts[i];
      if (!item) {
        continue
      }
      try {
        if (typeof item == 'function') {
          await item.call(this)
        } else {
          await item.remove()
        }
      } catch (e) {
        throw e
      }
    }
  })
  if (process.env.NODE_ENV == 'development') {
    delete db.models[name]
  }
  return db.model(name, schema);
};
