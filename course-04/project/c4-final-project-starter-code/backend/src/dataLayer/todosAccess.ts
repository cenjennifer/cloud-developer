import * as AWS  from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';
import {DocumentClient, GetItemOutput} from 'aws-sdk/clients/dynamodb';

const XAWS = AWSXRay.captureAWS(AWS);

import { TodoItem } from '../models/TodoItem'
import { TodosResponse } from '../models/TodoItemsResponse'
import {UpdateTodoRequest} from '../requests/UpdateTodoRequest';


export class TodoAccess {
  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    // private readonly todosUserIndex = process.env.TODOS_USER_INDEX,
    private readonly todoIdIndex = process.env.TODO_ID_INDEX
  ) {}

  async getAllTodosByUserId(userId: string, params): Promise<TodosResponse> {
    console.log('Fetching all todos for userId: ', userId);
    // NOTE: Refresher video on queries:
    // https://classroom.udacity.com/nanodegrees/nd9990/parts/a46aa194-de1d-45fd-83ef-d83080ee8f3c/modules/826241f6-8d5f-436b-b01e-4ea8885d866d/lessons/f0d2e109-7647-4660-b88e-862551411d33/concepts/ff78fe40-d035-4eb9-9fde-d9e51e2d24e1
    const result = await this.docClient.query({
      TableName: this.todosTable,
      IndexName: this.todoIdIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: params.limit,
      ExclusiveStartKey: params.nextKey,
      // Recap: https://youtu.be/qHq7G36BgD4 (4:42)
      ScanIndexForward: true // Will return the todos with the earliest due date
    }).promise()

    const items = result.Items
    return {
      items: items as TodoItem[],
      // encode the JSON object so the clinet cna return it in a URL as is
      nextKey: encodeNextKey(result.LastEvaluatedKey),
    };
  }

  async createTodo(todoItem: TodoItem): Promise<TodoItem> {
    await this.docClient.put({
      TableName: this.todosTable,
      Item: todoItem
    }).promise();

    return todoItem;
  }

  async updateTodo(userId: string, todoId: string, updatedTodo: UpdateTodoRequest) : Promise<UpdateTodoRequest> {
    await this.docClient.update({
      TableName: this.todosTable,
      Key: {
        todoId: todoId,
        userId: userId
      },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': updatedTodo.name,
        ':dueDate': updatedTodo.dueDate,
        ':done': updatedTodo.done,
      },
    }).promise();
    
    return updatedTodo;
  }

  async deleteTodo(userId: string, todoId: string) {
    await this.docClient.delete({
      TableName: this.todosTable,
      Key: {
        "todoId": todoId,
        "userId": userId
      }
    }).promise();
  }

  async checkTodoExists(userId: string, todoId: string) {
    const result = await this.getTodoItem(userId, todoId);
    return !!result.Item;
  }

  async getTodoItem(userId: string, todoId: string) : Promise<GetItemOutput> {
    return await this.docClient.get({
      TableName: this.todosTable,
      Key: {
        "userId": userId,
        "todoId": todoId
      }
    }).promise();
  }

  async addTodoAttachmentUrl(userId: string, todoId: string, attachmentUrl: string) {
    await this.docClient.update({
      TableName: this.todosTable,
      Key: {
        'todoId': todoId,
        'userId': userId
      },
      UpdateExpression: "set attachmentUrl = :attachmentUrl",
      ExpressionAttributeValues: {
        ":attachmentUrl": attachmentUrl
      }
    }).promise();
  }
}


function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log('Creating a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}

function encodeNextKey(lastEvaluatedKey) {
  if(!lastEvaluatedKey) {
    return null;
  }

  return encodeURIComponent(JSON.stringify(lastEvaluatedKey));
}