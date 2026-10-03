import React from 'react';
import ContentClient from './ContentClient';
import { getVideos } from './actions';

export const metadata = {
  title: 'Video Content Library | PM e-Vidya'
};

export default async function ContentPage() {
  const videos = await getVideos();
  return <ContentClient initialData={videos} />;
}
