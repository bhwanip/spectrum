// @flow
import React from 'react';
//$FlowFixMe
import compose from 'recompose/compose';
//$FlowFixMe
import pure from 'recompose/pure';
// $FlowFixMe
import { connect } from 'react-redux';
import { toggleChannelSubscriptionMutation } from '../../api/channel';
import { addToastWithTimeout } from '../../actions/toasts';
import ThreadComposer from '../../components/threadComposer';
import AppViewWrapper from '../../components/appViewWrapper';
import Column from '../../components/column';
import ThreadFeed from '../../components/threadFeed';
import { ChannelProfile } from '../../components/profile';
import PendingUsersNotification from './components/pendingUsersNotification';
import { getChannelThreads, getChannel } from './queries';
import { displayLoadingScreen } from '../../components/loading';
import {
  UpsellSignIn,
  Upsell404Channel,
  UpsellRequestToJoinChannel,
} from '../../components/upsell';

const ThreadFeedWithData = compose(getChannelThreads)(ThreadFeed);

const ChannelViewPure = ({
  match,
  data: { error, channel },
  currentUser,
  toggleChannelSubscription,
  dispatch,
}) => {
  const communitySlug = match.params.communitySlug;
  const channelSlug = match.params.channelSlug;

  const toggleRequest = channelId => {
    toggleChannelSubscription({ channelId })
      .then(({ data: { toggleChannelSubscription } }) => {
        const str = toggleChannelSubscription.isPending
          ? `Requested to join ${toggleChannelSubscription.name} in ${toggleChannelSubscription.community.name}!`
          : `Canceled request to join ${toggleChannelSubscription.name} in ${toggleChannelSubscription.community.name}.`;

        const type = toggleChannelSubscription.isPending
          ? 'success'
          : 'neutral';
        dispatch(addToastWithTimeout(type, str));
      })
      .catch(err => {
        dispatch(addToastWithTimeout('error', err));
      });
  };

  if (error) {
    return (
      <Upsell404Channel
        channel={match.params.channelSlug}
        community={match.params.communitySlug}
      />
    );
  }

  if (!channel || channel.isDeleted) {
    return (
      <Upsell404Channel
        channel={match.params.channelSlug}
        community={match.params.communitySlug}
      />
    );
  }

  // user has been blocked by the owners
  if (channel && channel.channelPermissions.isBlocked) {
    return (
      <Upsell404Channel
        channel={match.params.channelSlug}
        community={match.params.communitySlug}
        noPermission
      />
    );
  }
  // channel exists and the user is not a subscriber (accounts for signed-
  // out users as well)
  if (
    channel &&
    channel.isPrivate &&
    (!channel.channelPermissions.isMember &&
      !channel.community.communityPermissions.isOwner)
  ) {
    return (
      <UpsellRequestToJoinChannel
        channel={channel}
        community={match.params.communitySlug}
        isPending={channel.isPending}
        subscribe={toggleRequest}
      />
    );
  }

  // channel exists and
  // the channel is private + user is a subscriber
  // or channel is not private
  if (
    channel &&
    ((channel.isPrivate && channel.channelPermissions.isMember) ||
      channel.community.communityPermissions.isOwner ||
      !channel.isPrivate)
  ) {
    return (
      <AppViewWrapper>
        <Column type="secondary">
          <ChannelProfile data={{ channel }} profileSize="full" />

          {channel.isPrivate &&
            (channel.channelPermissions.isOwner ||
              channel.community.communityPermissions.isOwner) &&
            <PendingUsersNotification id={channel.id} />}
        </Column>

        <Column type="primary" alignItems="center">
          {!currentUser && <UpsellSignIn entity={channel} />}

          {channel.isMember && currentUser
            ? <ThreadComposer
                activeCommunity={communitySlug}
                activeChannel={match.params.channelSlug}
              />
            : <span />}
          <ThreadFeedWithData
            channelSlug={channelSlug}
            communitySlug={communitySlug}
          />
        </Column>
      </AppViewWrapper>
    );
  }
};

export const ChannelView = compose(
  getChannel,
  toggleChannelSubscriptionMutation,
  displayLoadingScreen,
  pure
)(ChannelViewPure);

const mapStateToProps = state => ({
  currentUser: state.users.currentUser,
});
export default connect(mapStateToProps)(ChannelView);
