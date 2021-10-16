import Model from './Model';
import Application from './Application';
import DataProvider from './DataProvider';
import ORMAdapter from './ORMAdapters/ORMAdapter';
import SequelizeAdapter from './ORMAdapters/SequelizeAdapter';

export default class ActiveDataProvider extends DataProvider {
  public query: { [key: string]: any } = {};
  public key: string;
  public ormAdapter;

  public constructor(config) {
    super(config);
    Object.assign(this, config);
  }

  public async init() {
    await super.init.call(this)
    if (this.ormAdapter === undefined) {
      this.ormAdapter = Application.getORMAdapter();
      console.log('adpi', this.ormAdapter)
      this.ormAdapter.modelClass = this.modelClass;
    }
  }

  public async prepareModels() {
    
    const pagination = this.getPagination();
    if (pagination !== false) {
      this.totalCountPromise = this.getTotalCount();
      pagination.totalCount = await this.totalCountPromise;
      
      if (pagination.totalCount === 0) return [];
      this.query.limit = pagination.getLimit();
      this.query.offset = pagination.getOffset();
      this.setPagination(pagination);
    }
    const sort = this.getSort();
    if (sort !== false && sort.getOrders().length > 0)
      this.query = this.ormAdapter.applySort(this.query, sort);
    
    return await this.ormAdapter.findAll(this.query);
  }

  public prepareKeys(models) {
    const keys = [];
    const modelPK = this.ormAdapter.primaryKey();
    if (this.key !== undefined) {
      for (const model of models) keys.push(model[this.key]);
    } else if (modelPK !== undefined) for (const model of models) keys.push(model[modelPK]);
    return keys;
  }

  public async prepareTotalCount() {
    const totalCount = await this.ormAdapter.count(this.query);
    
    return totalCount;
  }

  public setSort(value) {
    super.setSort.call(this, value);
    const sort = this.getSort();
    if (sort !== false) {
      const model = new (this.modelClass as any)();
      
      if (Object.keys(sort.attributes).length === 0) {
        const attributes = this.ormAdapter.attributes();
        for (const attribute of attributes) {
            sort.attributes[attribute] = {
              asc: [attribute, 'asc'],
              desc: [attribute, 'desc'],
              label: model.getAttributeLabel(attribute),
            };
        }
      } else {
        for (const attribute in sort.attributes) {
          if (sort.attributes[attribute].label === undefined)
            sort.attributes[attribute].label = model.getAttributeLabel(attribute);
        }
      }
    }
  }
}
