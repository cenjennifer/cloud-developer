import { Todo } from './Todo';

export interface TodosResponse {
  items: Todo[],
  nextKey: any
}