export const delay = (ms: number = 400): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const delayLikeApi = (): Promise<void> =>
  delay(250 + Math.floor(Math.random() * 350));