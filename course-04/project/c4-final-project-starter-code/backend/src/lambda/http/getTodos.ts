import 'source-map-support/register'
import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
import {getUserId} from '../utils';
import {getAllTodosByUserId} from '../../businessLogic/todos';

const logger = createLogger('getTodosHandler');
export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('event: ', event);
  const currentUserId = getUserId(event);

  // Implement pagination
  let limit;
  let nextKey;

  try {
    limit = parseLimitParameter(event);
    nextKey = parseNextKeyParameter(event);
  } catch (err) {
    logger.info('Failed to parse query params', err.message);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Invalid parameters'
      })
    }
  }

  const res = await getAllTodosByUserId(currentUserId, {limit, nextKey});
  logger.info('user: ', currentUserId, 'todos: ', res.items, 'nextKey: ', res.nextKey);

  if (Array.isArray(res.items) && res.items.length > 0) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        items: res.items,
        nextKey: res.nextKey
      })
    }
  }

  return {
    statusCode: 400,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: 'There is no todos found for this user'
  }
}

function getQueryParameter(event, name) {
  const queryParams = event.queryStringParameters;
  if (!queryParams) {
    return undefined;
  }

  return queryParams[name];
}

function parseNextKeyParameter(event) {
  const nextKeyString = getQueryParameter(event, 'nextKey');
  if (!nextKeyString) {
    return undefined;
  }

  const uriDecoded = decodeURIComponent(nextKeyString);
  return JSON.parse(uriDecoded);
}

function parseLimitParameter(event) {
  const limitString = getQueryParameter(event, 'limit');
  if (!limitString) {
    return undefined;
  }

  const limit = parseInt(limitString, 10);
  if (limit <= 0) {
    throw new Error('Limit must be positive');
  }

  return limit;
}