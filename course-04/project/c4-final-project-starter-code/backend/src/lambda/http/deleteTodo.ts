import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
import {getUserId} from '../utils';
import {deleteTodo, checkTodoExists} from '../../businessLogic/todos';
const logger = createLogger('deleteTodoHandler');

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId;
  const currentUserId = getUserId(event);
  logger.info(`Request to delete todo with Id ${todoId}`);

  const doesTodoExists = await checkTodoExists(currentUserId, todoId);
  if (!doesTodoExists) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: `Cannot find todo with todoId: ${todoId}`
    }
  }

  try {
    await deleteTodo(currentUserId, todoId);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: `Successfully deleted todo with Id: ${todoId}`
    }
  } catch (err) {
    logger.error(`Failed to delete todo with Id ${todoId}`, err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: `Failed to delete todo with Id: ${todoId}`
    }
  }
}
