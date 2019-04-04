<template>
  <Page :class="pageClasses" actionBarHidden="true" @loaded="pageLoaded" backgroundSpanUnderStatusBar="true" backgroundColor="#005686">
    <GridLayout class="container" columns="*" rows="*" backgroundColor="transparent">

      <StackLayout row="1" col="0" colSpan="2" height="100%" backgroundColor="#ffffff">
        <Button class="btn btn-primary" height="70" text="Get tokens" @tap="getTokens" />

        <GridLayout v-if="isToken" class="grid-token" columns="*, 2*, *" rows="auto, auto, auto" backgroundColor="#ffffff">  
          <Label height="70" row="1" col="0" text="Device Token "/>
          <TextView height="70" row="1" col="1" :text="truncateDeviceToken" textWrap="true" />
          <Button row="1" col="2" text="Send" @tap="sendToken(deviceToken, 'remote')" />
          
          <Label height="70" row="2" col="0" text="VoIP Token" />
          <TextView height="70" row="2" col="1" :text="truncateVoIPToken" textWrap="true" />
          <Button row="2" col="2" text="Send" @tap="sendToken(VoIPToken, 'voip')" />
        </GridLayout>

        <Label class="p-20" v-if="isToken" text="Click on `Send` next to the token to register it on a predefined push server.\nTo define a push server API url, go to Settings." textWrap="true" />
      </StackLayout>

    </GridLayout>
  </Page>
</template>

<script>
  import { isAndroid, isIOS } from 'tns-core-modules/platform'
  import * as applicationSettings from 'tns-core-modules/application-settings'
  import * as alertModule from '../utils/alert'
  import * as httpModule from 'tns-core-modules/http'
  import * as dialogs from 'tns-core-modules/ui/dialogs'

  export default {
    data() {
      return {
        isToken: false,
        pushServer: '',
        username: '',
        deviceToken: '',
        VoIPToken: ''
      }
    },

    computed: {
      pageClasses() {
        return {
          // add top class so we can apply styles to specific platforms
          'platform-ios page': isIOS,
          'platform-android page': isAndroid
        }
      },
      truncateDeviceToken() {
        return this.deviceToken.match(/.{1,50}/g).join('\n');
      },
      truncateVoIPToken() {
        return this.VoIPToken.match(/.{1,50}/g).join('\n');
      }
    },

    methods: {
      pageLoaded(args) {
        this.isToken = false; 
        this.pushServer = applicationSettings.getString('$$PushServer$$') || '';
        this.username = applicationSettings.getString('$$username$$') || '';
      },
      getTokens(args) {
        this.isToken = true;
        this.deviceToken = applicationSettings.getString('$$deviceToken$$') || '';
        this.VoIPToken = applicationSettings.getString('$$VoIPToken$$') || '';
        
        console.log('Device token', this.deviceToken);
        console.log('VoIP token', this.VoIPToken);
      },
      sendToken(token, type) {
        console.log('sending token', token);
        
        dialogs.prompt('Enter the webservice request url', this.pushServer)
        .then((r) => {
          if (r.result) {
            applicationSettings.setString('$$PushServer$$', r.text); // re-save url if differs
            this.sendRequest(r.text, {
                token: token,
                type: type,
                device: isIOS ? 'ios' : 'android',
                user: this.username,
                topic: isIOS ? 'com.test.APNTest' : 'com.test.FCMTest'
            });
          }
        })
      },
      sendRequest(url, data) {
        httpModule.request({
          url: url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          content: JSON.stringify(data)
        }).then((response) => {
          let json = response.content.toJSON();
          dialogs.alert({
            title: 'Success',
            message: 'Response: '+JSON.stringify(json),
            okButtonText: 'OK'
          });
        }, (e) => {
          dialogs.alert({
            title: 'Error',
            message: ''+e,
            okButtonText: 'OK'
          });
        });
      }
    }
  }
</script>

<style lang="scss" scoped>

  #wv{
    width:100%;
  }

  .platform-android .topbar {
    padding-top:10%;
  }

  .platform-android .icon {
    margin-top:5;
  }

  .grid-token {
    margin: 10;
  }
</style>
