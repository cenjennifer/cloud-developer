import { TodoItem } from './TodoItem';

export interface TodosResponse {
  items: TodoItem[],
  nextKey: any
}