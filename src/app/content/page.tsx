import React from 'react';
import ContentClient from './ContentClient';
import { getVideos } from './actions';
import { getTopicProductionRecords } from '../video-production/actions';

export const metadata = {
  title: 'Video Content Library | PM e-Vidya'
};

export default async function ContentPage() {
  const videos = await getVideos();
  const epicsResult = await getTopicProductionRecords();
  const epics = epicsResult.success ? epicsResult.data : [];
  return <ContentClient initialData={videos} epics={epics} />;
}
